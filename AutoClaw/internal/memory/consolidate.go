package memory

import (
	"fmt"
	"time"

	"github.com/philipbankier/autoclaw/internal/drift"
)

// ConsolidationResult describes what happened during consolidation.
type ConsolidationResult struct {
	Pruned        int
	Merged        int
	Promoted      int // working -> preferences
	SnapshotVer   int // preferences snapshot taken before changes
	WorkingBefore int
	WorkingAfter  int
	PrefsBefore   int
	PrefsAfter    int
}

// RunConsolidation executes the full consolidation cycle:
//  1. Snapshot preferences (for rollback safety)
//  2. Read all working memory entries
//  3. Call drift.Consolidator.GenerateConsolidationPlan()
//  4. Apply: prune, merge, promote high-salience to preferences
//  5. Rewrite working memory with survivors
func (t *TieredMemoryStore) RunConsolidation() (*ConsolidationResult, error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	result := &ConsolidationResult{}

	// 1. Snapshot preferences.
	snapVer, err := t.Preferences.Snapshot()
	if err != nil {
		return nil, fmt.Errorf("snapshot preferences: %w", err)
	}
	result.SnapshotVer = snapVer

	// 2. Read all working memory.
	workingEntries, err := t.Working.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("read working memory: %w", err)
	}
	result.WorkingBefore = len(workingEntries)

	if len(workingEntries) == 0 {
		return result, nil // nothing to consolidate
	}

	// 3. Convert to drift.MemoryEntry and generate plan.
	driftEntries := toDriftEntries(workingEntries)

	retentionDays := 30
	if t.memoryPolicy != nil && t.memoryPolicy.RetentionPolicy.TTLDays != nil {
		retentionDays = *t.memoryPolicy.RetentionPolicy.TTLDays
	}

	consolidator := drift.NewConsolidator()
	plan := consolidator.GenerateConsolidationPlan(driftEntries, retentionDays)

	// 4a. Build prune set.
	pruneSet := make(map[string]bool, len(plan.MemoriesToPrune))
	for _, id := range plan.MemoriesToPrune {
		pruneSet[id] = true
	}
	result.Pruned = len(plan.MemoriesToPrune)

	// 4b. Apply merges.
	mergedEntries := applyMerges(plan.MemoriesToMerge, workingEntries)
	result.Merged = len(plan.MemoriesToMerge)

	// Build survivor list: kept entries + merged results.
	mergeSourceIDs := collectMergeSourceIDs(plan.MemoriesToMerge)
	var survivors []MemoryEntry
	for _, e := range workingEntries {
		if pruneSet[e.ID] || mergeSourceIDs[e.ID] {
			continue
		}
		survivors = append(survivors, e)
	}
	survivors = append(survivors, mergedEntries...)

	// 4c. Promote high-salience entries (>= 0.7) to preferences.
	var promoted []MemoryEntry
	var remaining []MemoryEntry
	for _, e := range survivors {
		if e.Salience >= 0.7 {
			e.Layer = "preferences"
			e.Source = "consolidation"
			promoted = append(promoted, e)
		} else {
			remaining = append(remaining, e)
		}
	}
	result.Promoted = len(promoted)

	// 5. Rewrite working memory with remaining entries.
	if err := t.Working.Replace(remaining); err != nil {
		return nil, fmt.Errorf("rewrite working memory: %w", err)
	}
	result.WorkingAfter = len(remaining)

	// 6. Write promoted entries to preferences.
	result.PrefsBefore = t.Preferences.Meta().TotalEntries
	for _, e := range promoted {
		if err := t.Preferences.Write(e); err != nil {
			return nil, fmt.Errorf("write to preferences: %w", err)
		}
	}
	result.PrefsAfter = t.Preferences.Meta().TotalEntries

	// Update consolidation timestamp.
	t.Preferences.mu.Lock()
	t.Preferences.meta.LastConsolidation = time.Now().UTC().Format(time.RFC3339)
	t.Preferences.saveMeta()
	t.Preferences.mu.Unlock()

	return result, nil
}

// PreviewConsolidation generates a consolidation plan without executing it.
func (t *TieredMemoryStore) PreviewConsolidation() (*drift.ConsolidationPlan, error) {
	workingEntries, err := t.Working.ReadAll()
	if err != nil {
		return nil, err
	}

	driftEntries := toDriftEntries(workingEntries)

	retentionDays := 30
	if t.memoryPolicy != nil && t.memoryPolicy.RetentionPolicy.TTLDays != nil {
		retentionDays = *t.memoryPolicy.RetentionPolicy.TTLDays
	}

	consolidator := drift.NewConsolidator()
	plan := consolidator.GenerateConsolidationPlan(driftEntries, retentionDays)
	return &plan, nil
}

// --- Helper functions ---

func toDriftEntries(entries []MemoryEntry) []drift.MemoryEntry {
	out := make([]drift.MemoryEntry, len(entries))
	for i, e := range entries {
		out[i] = drift.MemoryEntry{
			ID:        e.ID,
			Content:   e.Content,
			Salience:  e.Salience,
			Timestamp: e.Timestamp.Format(time.RFC3339),
		}
	}
	return out
}

func applyMerges(groups []drift.MergeGroup, entries []MemoryEntry) []MemoryEntry {
	entryMap := make(map[string]MemoryEntry, len(entries))
	for _, e := range entries {
		entryMap[e.ID] = e
	}

	var merged []MemoryEntry
	for _, g := range groups {
		if len(g.SourceIDs) == 0 {
			continue
		}
		// Use the first source's timestamp and the highest salience.
		var maxSalience float64
		var ts time.Time
		for _, id := range g.SourceIDs {
			if e, ok := entryMap[id]; ok {
				if e.Salience > maxSalience {
					maxSalience = e.Salience
				}
				if ts.IsZero() || e.Timestamp.Before(ts) {
					ts = e.Timestamp
				}
			}
		}

		merged = append(merged, MemoryEntry{
			ID:        GenerateEntryID(),
			Content:   g.MergedContent,
			Salience:  maxSalience,
			Timestamp: ts,
			Source:    "consolidation",
			Layer:     "working",
		})
	}
	return merged
}

func collectMergeSourceIDs(groups []drift.MergeGroup) map[string]bool {
	ids := make(map[string]bool)
	for _, g := range groups {
		for _, id := range g.SourceIDs {
			ids[id] = true
		}
	}
	return ids
}
