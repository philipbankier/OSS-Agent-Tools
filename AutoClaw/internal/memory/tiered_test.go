package memory

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

func testWorkspace() *artifact.Workspace {
	return &artifact.Workspace{
		Constitution: testConstitution(),
		Memory: &artifact.MemoryV1{
			RetentionPolicy: artifact.MemoryRetentionPolicy{
				PruneStrategy: "oldest",
			},
		},
	}
}

func TestTieredMemoryStore_New(t *testing.T) {
	dir := t.TempDir()
	ws := testWorkspace()

	store, err := NewTieredMemoryStore(dir, ws)
	if err != nil {
		t.Fatal(err)
	}
	if store.Constitution == nil {
		t.Error("expected constitution layer")
	}
	if store.Preferences == nil {
		t.Error("expected preferences layer")
	}
	if store.Working == nil {
		t.Error("expected working layer")
	}
	if store.Performance == nil {
		t.Error("expected performance layer")
	}
}

func TestTieredMemoryStore_GetMemoryContext(t *testing.T) {
	dir := t.TempDir()
	ws := testWorkspace()
	store, _ := NewTieredMemoryStore(dir, ws)

	// Add some working memory.
	store.AppendWorkingMemory("User likes Go", 0.5)

	ctx := store.GetMemoryContext()
	if !strings.Contains(ctx, "Constitution") {
		t.Error("expected constitution section")
	}
	if !strings.Contains(ctx, "User likes Go") {
		t.Error("expected working memory content")
	}
}

func TestTieredMemoryStore_AppendWorkingMemory(t *testing.T) {
	dir := t.TempDir()
	ws := testWorkspace()
	store, _ := NewTieredMemoryStore(dir, ws)

	if err := store.AppendWorkingMemory("Test entry", 0.6); err != nil {
		t.Fatal(err)
	}

	entries, err := store.Working.ReadWindow()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].Content != "Test entry" {
		t.Errorf("Content = %q", entries[0].Content)
	}
}

func TestTieredMemoryStore_UpdateLongTermMemory(t *testing.T) {
	dir := t.TempDir()
	ws := testWorkspace()
	store, _ := NewTieredMemoryStore(dir, ws)

	if err := store.UpdateLongTermMemory("Important preference"); err != nil {
		t.Fatal(err)
	}

	entries, err := store.Preferences.LoadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 preference, got %d", len(entries))
	}
	if entries[0].Content != "Important preference" {
		t.Errorf("Content = %q", entries[0].Content)
	}
}

func TestTieredMemoryStore_Status(t *testing.T) {
	dir := t.TempDir()
	ws := testWorkspace()
	store, _ := NewTieredMemoryStore(dir, ws)

	store.AppendWorkingMemory("entry1", 0.5)
	store.AppendWorkingMemory("entry2", 0.6)
	store.Performance.RecordSuccess("read_file")

	status := store.Status()
	if status.ConstitutionPrinciples != 2 {
		t.Errorf("ConstitutionPrinciples = %d, want 2", status.ConstitutionPrinciples)
	}
	if status.WorkingEntries != 2 {
		t.Errorf("WorkingEntries = %d, want 2", status.WorkingEntries)
	}
	if status.PerformanceTools != 1 {
		t.Errorf("PerformanceTools = %d, want 1", status.PerformanceTools)
	}
}

func TestTieredMemoryStore_EmptyWorkspace(t *testing.T) {
	dir := t.TempDir()
	ws := &artifact.Workspace{
		Constitution: &artifact.ConstitutionV1{},
	}

	store, err := NewTieredMemoryStore(dir, ws)
	if err != nil {
		t.Fatal(err)
	}
	ctx := store.GetMemoryContext()
	// Should at least contain the constitution header.
	if !strings.Contains(ctx, "Constitution") {
		t.Error("expected constitution section even when empty")
	}
}

func TestInitTieredDirs(t *testing.T) {
	dir := t.TempDir()
	ws := &artifact.Workspace{
		Constitution: testConstitution(),
		Memory: &artifact.MemoryV1{},
	}

	if err := InitTieredDirs(dir, ws); err != nil {
		t.Fatal(err)
	}

	// Verify directory structure.
	expected := []string{
		"memory/tiered/constitution",
		"memory/tiered/preferences/snapshots",
		"memory/tiered/working",
		"memory/tiered/performance",
	}
	for _, d := range expected {
		path := filepath.Join(dir, d)
		if _, err := os.Stat(path); err != nil {
			t.Errorf("expected directory %s to exist", d)
		}
	}

	// Verify principles.json was created.
	principlesPath := filepath.Join(dir, "memory/tiered/constitution/principles.json")
	if _, err := os.Stat(principlesPath); err != nil {
		t.Error("expected principles.json")
	}
}
