package drift

import (
	"strings"
	"time"
)

// MemoryEntry represents a single memory for consolidation.
type MemoryEntry struct {
	ID        string  `json:"id"`
	Content   string  `json:"content"`
	Salience  float64 `json:"salience"`  // 0.0-1.0
	Timestamp string  `json:"timestamp"` // ISO8601
}

// MergeGroup describes memories to be consolidated.
type MergeGroup struct {
	SourceIDs     []string `json:"source_ids"`
	MergedContent string   `json:"merged_content"`
}

// ConsolidationPlan describes what to keep, prune, and merge.
type ConsolidationPlan struct {
	Timestamp      string       `json:"timestamp"`
	MemoriesToKeep []string     `json:"memories_to_keep"`
	MemoriesToPrune []string    `json:"memories_to_prune"`
	MemoriesToMerge []MergeGroup `json:"memories_to_merge"`
}

// Consolidator manages memory lifecycle.
// Algorithm matches TasteKit:
//   - Keep if recent OR salience > 0.7
//   - Merge if Jaccard similarity >= 0.6
//   - Highest salience = primary in merge
type Consolidator struct{}

// NewConsolidator creates a memory consolidator.
func NewConsolidator() *Consolidator {
	return &Consolidator{}
}

// GenerateConsolidationPlan analyzes memories and returns a plan.
func (c *Consolidator) GenerateConsolidationPlan(memories []MemoryEntry, retentionDays int) ConsolidationPlan {
	now := time.Now().UTC()
	cutoff := now.AddDate(0, 0, -retentionDays)

	plan := ConsolidationPlan{
		Timestamp: now.Format(time.RFC3339),
	}

	// Step 1: Retention filter.
	var toKeep []MemoryEntry
	for _, m := range memories {
		t, err := time.Parse(time.RFC3339, m.Timestamp)
		if err != nil {
			// If we can't parse the timestamp, keep it to be safe.
			toKeep = append(toKeep, m)
			continue
		}
		if !t.Before(cutoff) || m.Salience > 0.7 {
			toKeep = append(toKeep, m)
		} else {
			plan.MemoriesToPrune = append(plan.MemoriesToPrune, m.ID)
		}
	}

	// Step 2: Similarity-based merge detection (Jaccard >= 0.6).
	merged := make(map[string]bool)
	for i := 0; i < len(toKeep); i++ {
		if merged[toKeep[i].ID] {
			continue
		}
		group := []MemoryEntry{toKeep[i]}
		for j := i + 1; j < len(toKeep); j++ {
			if merged[toKeep[j].ID] {
				continue
			}
			if JaccardSimilarity(toKeep[i].Content, toKeep[j].Content) >= 0.6 {
				group = append(group, toKeep[j])
				merged[toKeep[j].ID] = true
			}
		}

		if len(group) > 1 {
			merged[toKeep[i].ID] = true
			mg := c.mergeGroup(group)
			plan.MemoriesToMerge = append(plan.MemoriesToMerge, mg)
		}
	}

	// Step 3: Collect standalone (unmerged) memories.
	for _, m := range toKeep {
		if !merged[m.ID] {
			plan.MemoriesToKeep = append(plan.MemoriesToKeep, m.ID)
		}
	}

	return plan
}

// mergeGroup consolidates similar memories. Highest salience becomes primary;
// unique content from others is appended.
func (c *Consolidator) mergeGroup(group []MemoryEntry) MergeGroup {
	// Sort by salience descending (simple selection of max).
	maxIdx := 0
	for i, m := range group {
		if m.Salience > group[maxIdx].Salience {
			maxIdx = i
		}
	}
	// Move primary to front.
	group[0], group[maxIdx] = group[maxIdx], group[0]

	primary := group[0]
	var ids []string
	for _, m := range group {
		ids = append(ids, m.ID)
	}

	var additionalDetails []string
	for _, m := range group[1:] {
		unique := ExtractUniqueContent(m.Content, primary.Content)
		if unique != "" {
			additionalDetails = append(additionalDetails, unique)
		}
	}

	content := primary.Content
	if len(additionalDetails) > 0 {
		content += "\n\nAdditional context: " + strings.Join(additionalDetails, "; ")
	}

	return MergeGroup{
		SourceIDs:     ids,
		MergedContent: content,
	}
}
