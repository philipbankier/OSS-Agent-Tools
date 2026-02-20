package memory

import (
	"path/filepath"
	"testing"
	"time"
)

func TestWorkingLayer_WriteAndReadWindow(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "working")
	layer := NewWorkingLayer(dir, nil)

	entry := MemoryEntry{
		Content:   "User prefers bullet points",
		Salience:  0.5,
		Timestamp: time.Now().UTC(),
		Source:    "agent",
	}
	if err := layer.Write(entry); err != nil {
		t.Fatal(err)
	}

	entries, err := layer.ReadWindow()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Fatalf("ReadWindow: got %d entries, want 1", len(entries))
	}
	if entries[0].Content != "User prefers bullet points" {
		t.Errorf("Content = %q", entries[0].Content)
	}
	if entries[0].ID == "" {
		t.Error("expected auto-generated ID")
	}
}

func TestWorkingLayer_OutsideWindowExcluded(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "working")
	layer := NewWorkingLayer(dir, nil) // default 30 days

	// Write an entry timestamped 60 days ago.
	old := MemoryEntry{
		ID:        "old-entry",
		Content:   "Ancient memory",
		Salience:  0.3,
		Timestamp: time.Now().UTC().AddDate(0, 0, -60),
		Source:    "agent",
	}
	monthFile := filepath.Join(dir, old.Timestamp.Format("200601")+".jsonl")
	if err := AppendJSONL(monthFile, old); err != nil {
		t.Fatal(err)
	}

	// Write a recent entry.
	recent := MemoryEntry{
		Content:   "Recent memory",
		Salience:  0.5,
		Timestamp: time.Now().UTC(),
		Source:    "agent",
	}
	if err := layer.Write(recent); err != nil {
		t.Fatal(err)
	}

	entries, err := layer.ReadWindow()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Fatalf("ReadWindow: got %d entries, want 1 (only recent)", len(entries))
	}
	if entries[0].Content != "Recent memory" {
		t.Errorf("Content = %q", entries[0].Content)
	}
}

func TestWorkingLayer_GetContext(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "working")
	layer := NewWorkingLayer(dir, nil)

	for i := 0; i < 3; i++ {
		entry := MemoryEntry{
			Content:   "Memory item " + string(rune('A'+i)),
			Salience:  0.5,
			Timestamp: time.Now().UTC().Add(time.Duration(-i) * time.Hour),
			Source:    "agent",
		}
		if err := layer.Write(entry); err != nil {
			t.Fatal(err)
		}
	}

	ctx := layer.GetContext(0)
	if ctx == "" {
		t.Fatal("expected non-empty context")
	}
	// Most recent should appear first.
	idxA := indexOf(ctx, "Memory item A")
	idxC := indexOf(ctx, "Memory item C")
	if idxA > idxC {
		t.Error("expected most recent entry first")
	}
}

func TestWorkingLayer_Prune(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "working")
	layer := NewWorkingLayer(dir, nil)

	entries := []MemoryEntry{
		{ID: "keep-1", Content: "Keep me", Salience: 0.5, Timestamp: time.Now().UTC(), Source: "agent"},
		{ID: "prune-1", Content: "Remove me", Salience: 0.1, Timestamp: time.Now().UTC(), Source: "agent"},
		{ID: "keep-2", Content: "Keep me too", Salience: 0.8, Timestamp: time.Now().UTC(), Source: "agent"},
	}
	for _, e := range entries {
		if err := layer.Write(e); err != nil {
			t.Fatal(err)
		}
	}

	if err := layer.Prune([]string{"prune-1"}); err != nil {
		t.Fatal(err)
	}

	remaining, err := layer.ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(remaining) != 2 {
		t.Fatalf("after prune: %d entries, want 2", len(remaining))
	}
	for _, r := range remaining {
		if r.ID == "prune-1" {
			t.Error("pruned entry still present")
		}
	}
}

func TestWorkingLayer_Replace(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "working")
	layer := NewWorkingLayer(dir, nil)

	// Write some entries.
	for i := 0; i < 5; i++ {
		layer.Write(MemoryEntry{
			Content: "Original", Salience: 0.3, Timestamp: time.Now().UTC(), Source: "agent",
		})
	}

	// Replace with different entries.
	newEntries := []MemoryEntry{
		{ID: "new-1", Content: "Replaced", Salience: 0.9, Timestamp: time.Now().UTC()},
		{ID: "new-2", Content: "Also replaced", Salience: 0.8, Timestamp: time.Now().UTC()},
	}
	if err := layer.Replace(newEntries); err != nil {
		t.Fatal(err)
	}

	all, err := layer.ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(all) != 2 {
		t.Fatalf("after replace: %d entries, want 2", len(all))
	}
}

func TestWorkingLayer_EntryCount(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "working")
	layer := NewWorkingLayer(dir, nil)

	for i := 0; i < 3; i++ {
		layer.Write(MemoryEntry{
			Content: "item", Salience: 0.5, Timestamp: time.Now().UTC(), Source: "agent",
		})
	}
	if layer.EntryCount() != 3 {
		t.Errorf("EntryCount = %d, want 3", layer.EntryCount())
	}
}

func TestWorkingLayer_EmptyDir(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "working")
	layer := NewWorkingLayer(dir, nil)

	entries, err := layer.ReadWindow()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 {
		t.Errorf("expected 0 entries from empty dir, got %d", len(entries))
	}
}

func TestWorkingLayer_LargeWrite(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "working")
	layer := NewWorkingLayer(dir, nil)

	// Write 1000 entries to verify streaming/no OOM.
	for i := 0; i < 1000; i++ {
		layer.Write(MemoryEntry{
			Content: "Bulk entry", Salience: 0.3, Timestamp: time.Now().UTC(), Source: "agent",
		})
	}

	entries, err := layer.ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1000 {
		t.Errorf("got %d entries, want 1000", len(entries))
	}
}

func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
