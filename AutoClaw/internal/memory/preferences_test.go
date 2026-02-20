package memory

import (
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestPreferencesLayer_WriteAndLoadAll(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "prefs")
	layer, err := NewPreferencesLayer(dir)
	if err != nil {
		t.Fatal(err)
	}

	entry := MemoryEntry{
		ID:        "pref-1",
		Content:   "User prefers dark mode",
		Salience:  0.85,
		Timestamp: time.Now().UTC(),
		Source:    "consolidation",
	}
	if err := layer.Write(entry); err != nil {
		t.Fatal(err)
	}

	entries, err := layer.LoadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Fatalf("LoadAll: got %d, want 1", len(entries))
	}
	if entries[0].Content != "User prefers dark mode" {
		t.Errorf("Content = %q", entries[0].Content)
	}
}

func TestPreferencesLayer_GetContext_SalienceOrdering(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "prefs")
	layer, _ := NewPreferencesLayer(dir)

	entries := []MemoryEntry{
		{ID: "low", Content: "Low priority", Salience: 0.3, Timestamp: time.Now().UTC()},
		{ID: "high", Content: "High priority", Salience: 0.95, Timestamp: time.Now().UTC()},
		{ID: "mid", Content: "Mid priority", Salience: 0.6, Timestamp: time.Now().UTC()},
	}
	for _, e := range entries {
		layer.Write(e)
	}

	ctx := layer.GetContext(0)
	highIdx := strings.Index(ctx, "High priority")
	lowIdx := strings.Index(ctx, "Low priority")
	if highIdx > lowIdx {
		t.Error("expected high salience entry before low salience")
	}
}

func TestPreferencesLayer_Snapshot(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "prefs")
	layer, _ := NewPreferencesLayer(dir)

	layer.Write(MemoryEntry{ID: "s1", Content: "First pref", Salience: 0.8, Timestamp: time.Now().UTC()})

	ver, err := layer.Snapshot()
	if err != nil {
		t.Fatal(err)
	}
	if ver != 1 {
		t.Errorf("version = %d, want 1", ver)
	}

	// Take another snapshot.
	ver2, err := layer.Snapshot()
	if err != nil {
		t.Fatal(err)
	}
	if ver2 != 2 {
		t.Errorf("version = %d, want 2", ver2)
	}
}

func TestPreferencesLayer_Rollback(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "prefs")
	layer, _ := NewPreferencesLayer(dir)

	// Write and snapshot.
	layer.Write(MemoryEntry{ID: "orig", Content: "Original", Salience: 0.8, Timestamp: time.Now().UTC()})
	ver, _ := layer.Snapshot()

	// Write more.
	layer.Write(MemoryEntry{ID: "new", Content: "Added later", Salience: 0.5, Timestamp: time.Now().UTC()})

	entries, _ := layer.LoadAll()
	if len(entries) != 2 {
		t.Fatalf("before rollback: %d entries, want 2", len(entries))
	}

	// Rollback.
	if err := layer.Rollback(ver); err != nil {
		t.Fatal(err)
	}

	entries, _ = layer.LoadAll()
	if len(entries) != 1 {
		t.Fatalf("after rollback: %d entries, want 1", len(entries))
	}
	if entries[0].Content != "Original" {
		t.Errorf("Content = %q, want 'Original'", entries[0].Content)
	}
}

func TestPreferencesLayer_RollbackNotFound(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "prefs")
	layer, _ := NewPreferencesLayer(dir)

	err := layer.Rollback(999)
	if err == nil {
		t.Fatal("expected error for nonexistent snapshot")
	}
}

func TestPreferencesLayer_ListSnapshots(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "prefs")
	layer, _ := NewPreferencesLayer(dir)

	layer.Snapshot()
	layer.Snapshot()
	layer.Snapshot()

	versions, err := layer.ListSnapshots()
	if err != nil {
		t.Fatal(err)
	}
	if len(versions) != 3 {
		t.Fatalf("ListSnapshots: got %d, want 3", len(versions))
	}
	if versions[0] != 1 || versions[2] != 3 {
		t.Errorf("versions = %v, want [1, 2, 3]", versions)
	}
}

func TestPreferencesLayer_Diff(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "prefs")
	layer, _ := NewPreferencesLayer(dir)

	// Snapshot v1 with one entry.
	layer.Write(MemoryEntry{ID: "shared", Content: "Shared", Salience: 0.5, Timestamp: time.Now().UTC()})
	layer.Snapshot()

	// Snapshot v2 with shared + new entry.
	layer.Write(MemoryEntry{ID: "added", Content: "New entry", Salience: 0.7, Timestamp: time.Now().UTC()})
	layer.Snapshot()

	diffs, err := layer.Diff(1, 2)
	if err != nil {
		t.Fatal(err)
	}

	var addedCount int
	for _, d := range diffs {
		if d.Type == "added" {
			addedCount++
		}
	}
	if addedCount != 1 {
		t.Errorf("expected 1 added entry, got %d", addedCount)
	}
}

func TestPreferencesLayer_Meta(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "prefs")
	layer, _ := NewPreferencesLayer(dir)

	layer.Write(MemoryEntry{ID: "m1", Content: "test", Salience: 0.5, Timestamp: time.Now().UTC()})
	layer.Write(MemoryEntry{ID: "m2", Content: "test2", Salience: 0.6, Timestamp: time.Now().UTC()})

	meta := layer.Meta()
	if meta.TotalEntries != 2 {
		t.Errorf("TotalEntries = %d, want 2", meta.TotalEntries)
	}
}

func TestPreferencesLayer_ConcurrentWrite(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "prefs")
	layer, _ := NewPreferencesLayer(dir)

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			layer.Write(MemoryEntry{
				Content:   "concurrent entry",
				Salience:  0.5,
				Timestamp: time.Now().UTC(),
				Source:    "test",
			})
		}(i)
	}
	wg.Wait()

	entries, err := layer.LoadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 20 {
		t.Errorf("got %d entries, want 20", len(entries))
	}
}

func TestPreferencesLayer_EmptyGetContext(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "prefs")
	layer, _ := NewPreferencesLayer(dir)

	ctx := layer.GetContext(0)
	if ctx != "" {
		t.Errorf("expected empty context, got %q", ctx)
	}
}
