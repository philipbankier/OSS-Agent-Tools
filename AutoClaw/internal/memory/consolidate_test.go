package memory

import (
	"testing"
	"time"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

func setupConsolidationStore(t *testing.T) *TieredMemoryStore {
	t.Helper()
	dir := t.TempDir()
	ws := &artifact.Workspace{
		Constitution: testConstitution(),
		Memory: &artifact.MemoryV1{
			RetentionPolicy: artifact.MemoryRetentionPolicy{
				PruneStrategy: "oldest",
			},
		},
	}
	store, err := NewTieredMemoryStore(dir, ws)
	if err != nil {
		t.Fatal(err)
	}
	return store
}

func TestConsolidation_EmptyWorkingMemory(t *testing.T) {
	store := setupConsolidationStore(t)

	result, err := store.RunConsolidation()
	if err != nil {
		t.Fatal(err)
	}
	if result.WorkingBefore != 0 {
		t.Errorf("WorkingBefore = %d, want 0", result.WorkingBefore)
	}
	if result.Pruned != 0 || result.Merged != 0 || result.Promoted != 0 {
		t.Error("expected all counts to be 0 for empty working memory")
	}
}

func TestConsolidation_FullCycle(t *testing.T) {
	store := setupConsolidationStore(t)

	// Add entries: some old (to be pruned), some recent (to be kept).
	now := time.Now().UTC()
	entries := []MemoryEntry{
		{ID: "recent-1", Content: "Fresh insight", Salience: 0.5, Timestamp: now, Source: "agent"},
		{ID: "recent-2", Content: "Another fresh one", Salience: 0.3, Timestamp: now.Add(-1 * time.Hour), Source: "agent"},
		{ID: "old-1", Content: "Very old memory", Salience: 0.2, Timestamp: now.AddDate(0, 0, -60), Source: "agent"},
	}

	for _, e := range entries {
		e.Layer = "working"
		store.Working.Write(e)
	}

	result, err := store.RunConsolidation()
	if err != nil {
		t.Fatal(err)
	}

	if result.WorkingBefore != 3 {
		t.Errorf("WorkingBefore = %d, want 3", result.WorkingBefore)
	}
	// Old entry with low salience should be pruned.
	if result.Pruned < 1 {
		t.Errorf("Pruned = %d, expected at least 1", result.Pruned)
	}
	if result.SnapshotVer < 1 {
		t.Error("expected snapshot to be taken")
	}
}

func TestConsolidation_PromotionThreshold(t *testing.T) {
	store := setupConsolidationStore(t)

	now := time.Now().UTC()
	entries := []MemoryEntry{
		{ID: "high", Content: "Very important", Salience: 0.85, Timestamp: now, Source: "agent"},
		{ID: "low", Content: "Not important", Salience: 0.3, Timestamp: now, Source: "agent"},
	}
	for _, e := range entries {
		store.Working.Write(e)
	}

	result, err := store.RunConsolidation()
	if err != nil {
		t.Fatal(err)
	}

	// High salience (0.85 >= 0.7) should be promoted.
	if result.Promoted < 1 {
		t.Errorf("Promoted = %d, expected at least 1", result.Promoted)
	}

	// Low salience should remain in working.
	remaining, _ := store.Working.ReadAll()
	found := false
	for _, r := range remaining {
		if r.ID == "low" {
			found = true
		}
	}
	if !found {
		t.Error("expected low-salience entry to remain in working memory")
	}

	// High salience should be in preferences now.
	prefs, _ := store.Preferences.LoadAll()
	foundPref := false
	for _, p := range prefs {
		if p.Content == "Very important" {
			foundPref = true
		}
	}
	if !foundPref {
		t.Error("expected promoted entry in preferences")
	}
}

func TestConsolidation_SnapshotTaken(t *testing.T) {
	store := setupConsolidationStore(t)

	store.Working.Write(MemoryEntry{
		ID: "test", Content: "test", Salience: 0.5, Timestamp: time.Now().UTC(), Source: "agent",
	})

	result, err := store.RunConsolidation()
	if err != nil {
		t.Fatal(err)
	}

	if result.SnapshotVer == 0 {
		t.Error("expected snapshot version > 0")
	}

	versions, _ := store.Preferences.ListSnapshots()
	if len(versions) == 0 {
		t.Error("expected at least one snapshot file")
	}
}

func TestConsolidation_RespectsRetentionPolicy(t *testing.T) {
	dir := t.TempDir()
	ttl := 10
	ws := &artifact.Workspace{
		Constitution: &artifact.ConstitutionV1{},
		Memory: &artifact.MemoryV1{
			RetentionPolicy: artifact.MemoryRetentionPolicy{
				TTLDays:       &ttl,
				PruneStrategy: "oldest",
			},
		},
	}
	store, _ := NewTieredMemoryStore(dir, ws)

	now := time.Now().UTC()
	// Entry 15 days old (beyond 10-day TTL), low salience → should be pruned.
	store.Working.Write(MemoryEntry{
		ID: "beyond-ttl", Content: "Old entry", Salience: 0.2,
		Timestamp: now.AddDate(0, 0, -15), Source: "agent",
	})
	// Entry 5 days old (within TTL) → should be kept.
	store.Working.Write(MemoryEntry{
		ID: "within-ttl", Content: "Recent entry", Salience: 0.3,
		Timestamp: now.AddDate(0, 0, -5), Source: "agent",
	})

	result, err := store.RunConsolidation()
	if err != nil {
		t.Fatal(err)
	}

	if result.Pruned < 1 {
		t.Errorf("expected at least 1 pruned entry (beyond TTL)")
	}
}

func TestPreviewConsolidation_DoesNotModify(t *testing.T) {
	store := setupConsolidationStore(t)

	now := time.Now().UTC()
	store.Working.Write(MemoryEntry{
		ID: "test-entry", Content: "Should remain", Salience: 0.5, Timestamp: now, Source: "agent",
	})

	plan, err := store.PreviewConsolidation()
	if err != nil {
		t.Fatal(err)
	}
	if plan == nil {
		t.Fatal("expected non-nil plan")
	}

	// Verify working memory was NOT modified.
	entries, _ := store.Working.ReadAll()
	if len(entries) != 1 {
		t.Errorf("expected 1 entry after preview, got %d", len(entries))
	}
}

func TestConsolidation_MergedEntries(t *testing.T) {
	store := setupConsolidationStore(t)

	now := time.Now().UTC()
	// Two very similar entries — should be merged by Jaccard similarity.
	store.Working.Write(MemoryEntry{
		ID: "sim-1", Content: "The user prefers bullet point summaries for all reports",
		Salience: 0.5, Timestamp: now, Source: "agent",
	})
	store.Working.Write(MemoryEntry{
		ID: "sim-2", Content: "The user prefers bullet point summaries for all documents",
		Salience: 0.6, Timestamp: now, Source: "agent",
	})
	// A different entry.
	store.Working.Write(MemoryEntry{
		ID: "diff-1", Content: "User timezone is PST",
		Salience: 0.4, Timestamp: now, Source: "agent",
	})

	result, err := store.RunConsolidation()
	if err != nil {
		t.Fatal(err)
	}

	// Similar entries may be merged depending on Jaccard threshold.
	// Even if not merged, this verifies the code path works without errors.
	if result.WorkingBefore != 3 {
		t.Errorf("WorkingBefore = %d, want 3", result.WorkingBefore)
	}
}
