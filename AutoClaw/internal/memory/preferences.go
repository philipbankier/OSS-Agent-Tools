package memory

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// PreferencesLayer manages the semi-mutable preferences tier.
// Entries are salience-scored and versioned for rollback support.
type PreferencesLayer struct {
	dir  string
	meta PreferencesMeta
	mu   sync.RWMutex
}

// NewPreferencesLayer loads or initializes a preferences layer.
func NewPreferencesLayer(dir string) (*PreferencesLayer, error) {
	os.MkdirAll(dir, 0o755)
	os.MkdirAll(filepath.Join(dir, "snapshots"), 0o755)

	l := &PreferencesLayer{dir: dir}

	// Load meta if it exists.
	metaPath := filepath.Join(dir, "meta.json")
	data, err := os.ReadFile(metaPath)
	if err == nil {
		json.Unmarshal(data, &l.meta)
	}

	return l, nil
}

func (l *PreferencesLayer) Name() string     { return "preferences" }
func (l *PreferencesLayer) IsReadOnly() bool  { return false }

// Write appends a single entry to the preferences layer.
func (l *PreferencesLayer) Write(entry MemoryEntry) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if entry.ID == "" {
		entry.ID = GenerateEntryID()
	}
	entry.Layer = "preferences"

	path := filepath.Join(l.dir, "current.jsonl")
	if err := AppendJSONL(path, entry); err != nil {
		return err
	}

	l.meta.TotalEntries++
	return l.saveMeta()
}

// LoadAll reads all preference entries.
func (l *PreferencesLayer) LoadAll() ([]MemoryEntry, error) {
	l.mu.RLock()
	defer l.mu.RUnlock()

	return ReadJSONL(filepath.Join(l.dir, "current.jsonl"))
}

// GetContext returns preferences sorted by salience, formatted for the system prompt.
func (l *PreferencesLayer) GetContext(maxChars int) string {
	entries, err := l.LoadAll()
	if err != nil || len(entries) == 0 {
		return ""
	}

	// Sort by salience descending.
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Salience > entries[j].Salience
	})

	var b strings.Builder
	b.WriteString("## Learned Preferences (Drift-Tracked)\n\n")

	for _, e := range entries {
		line := fmt.Sprintf("- [%.2f] %s\n", e.Salience, e.Content)
		if maxChars > 0 && b.Len()+len(line) > maxChars {
			break
		}
		b.WriteString(line)
	}
	return b.String()
}

// Snapshot copies current.jsonl to snapshots/vNNN.jsonl.
func (l *PreferencesLayer) Snapshot() (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.meta.CurrentVersion++
	ver := l.meta.CurrentVersion

	src := filepath.Join(l.dir, "current.jsonl")
	dst := filepath.Join(l.dir, "snapshots", fmt.Sprintf("v%03d.jsonl", ver))

	// Copy file (or create empty if no current preferences).
	data, err := os.ReadFile(src)
	if err != nil {
		if os.IsNotExist(err) {
			data = nil
		} else {
			return 0, fmt.Errorf("read current: %w", err)
		}
	}
	if err := os.WriteFile(dst, data, 0o644); err != nil {
		return 0, fmt.Errorf("write snapshot: %w", err)
	}

	return ver, l.saveMeta()
}

// Rollback restores preferences from a specific snapshot version.
func (l *PreferencesLayer) Rollback(version int) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	src := filepath.Join(l.dir, "snapshots", fmt.Sprintf("v%03d.jsonl", version))
	if _, err := os.Stat(src); err != nil {
		return fmt.Errorf("snapshot v%03d not found", version)
	}

	data, err := os.ReadFile(src)
	if err != nil {
		return fmt.Errorf("read snapshot: %w", err)
	}

	dst := filepath.Join(l.dir, "current.jsonl")
	if err := os.WriteFile(dst, data, 0o644); err != nil {
		return fmt.Errorf("restore current: %w", err)
	}

	// Recount entries.
	entries, _ := ReadJSONL(dst)
	l.meta.TotalEntries = len(entries)
	return l.saveMeta()
}

// ListSnapshots returns sorted version numbers of available snapshots.
func (l *PreferencesLayer) ListSnapshots() ([]int, error) {
	l.mu.RLock()
	defer l.mu.RUnlock()

	dir := filepath.Join(l.dir, "snapshots")
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var versions []int
	for _, e := range entries {
		name := e.Name()
		if !strings.HasPrefix(name, "v") || !strings.HasSuffix(name, ".jsonl") {
			continue
		}
		numStr := strings.TrimSuffix(strings.TrimPrefix(name, "v"), ".jsonl")
		if v, err := strconv.Atoi(numStr); err == nil {
			versions = append(versions, v)
		}
	}
	sort.Ints(versions)
	return versions, nil
}

// Diff compares two snapshots and returns the differences.
func (l *PreferencesLayer) Diff(vA, vB int) ([]DiffEntry, error) {
	l.mu.RLock()
	defer l.mu.RUnlock()

	pathA := filepath.Join(l.dir, "snapshots", fmt.Sprintf("v%03d.jsonl", vA))
	pathB := filepath.Join(l.dir, "snapshots", fmt.Sprintf("v%03d.jsonl", vB))

	entriesA, err := ReadJSONL(pathA)
	if err != nil {
		return nil, fmt.Errorf("read snapshot v%03d: %w", vA, err)
	}
	entriesB, err := ReadJSONL(pathB)
	if err != nil {
		return nil, fmt.Errorf("read snapshot v%03d: %w", vB, err)
	}

	mapA := make(map[string]MemoryEntry, len(entriesA))
	for _, e := range entriesA {
		mapA[e.ID] = e
	}
	mapB := make(map[string]MemoryEntry, len(entriesB))
	for _, e := range entriesB {
		mapB[e.ID] = e
	}

	var diffs []DiffEntry

	// Entries in B but not in A → added.
	for id, e := range mapB {
		if _, ok := mapA[id]; !ok {
			diffs = append(diffs, DiffEntry{Type: "added", Entry: e})
		}
	}

	// Entries in A but not in B → removed.
	for id, e := range mapA {
		if _, ok := mapB[id]; !ok {
			diffs = append(diffs, DiffEntry{Type: "removed", Entry: e})
		}
	}

	// Entries in both with different content → changed.
	for id, a := range mapA {
		if b, ok := mapB[id]; ok {
			if a.Content != b.Content || a.Salience != b.Salience {
				diffs = append(diffs, DiffEntry{Type: "changed", Entry: b})
			}
		}
	}

	return diffs, nil
}

// Meta returns the current preferences metadata.
func (l *PreferencesLayer) Meta() PreferencesMeta {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return l.meta
}

func (l *PreferencesLayer) saveMeta() error {
	path := filepath.Join(l.dir, "meta.json")
	data, err := json.MarshalIndent(l.meta, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}
