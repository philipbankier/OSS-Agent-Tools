package memory

import (
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

// WorkingLayer manages the 30-day rolling working memory window.
// Entries are stored in monthly JSONL files (YYYYMM.jsonl).
type WorkingLayer struct {
	dir           string
	retentionDays int
	pruneStrategy string // "oldest"|"least_salient"|"manual"
}

// NewWorkingLayer creates a working memory layer.
func NewWorkingLayer(dir string, retention *artifact.MemoryRetentionPolicy) *WorkingLayer {
	days := 30
	strategy := "oldest"
	if retention != nil {
		if retention.TTLDays != nil {
			days = *retention.TTLDays
		}
		if retention.PruneStrategy != "" {
			strategy = retention.PruneStrategy
		}
	}
	os.MkdirAll(dir, 0o755)
	return &WorkingLayer{
		dir:           dir,
		retentionDays: days,
		pruneStrategy: strategy,
	}
}

func (l *WorkingLayer) Name() string     { return "working" }
func (l *WorkingLayer) IsReadOnly() bool  { return false }

// Write appends an entry to the current month's JSONL file.
func (l *WorkingLayer) Write(entry MemoryEntry) error {
	if entry.ID == "" {
		entry.ID = GenerateEntryID()
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now().UTC()
	}
	entry.Layer = "working"

	monthFile := filepath.Join(l.dir, entry.Timestamp.Format("200601")+".jsonl")
	return AppendJSONL(monthFile, entry)
}

// ReadWindow returns entries within the retention window.
func (l *WorkingLayer) ReadWindow() ([]MemoryEntry, error) {
	cutoff := time.Now().UTC().AddDate(0, 0, -l.retentionDays)
	all, err := l.ReadAll()
	if err != nil {
		return nil, err
	}

	var window []MemoryEntry
	for _, e := range all {
		if !e.Timestamp.Before(cutoff) {
			window = append(window, e)
		}
	}
	return window, nil
}

// ReadAll returns all entries across all monthly files.
func (l *WorkingLayer) ReadAll() ([]MemoryEntry, error) {
	entries, err := os.ReadDir(l.dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var all []MemoryEntry
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".jsonl" {
			continue
		}
		records, err := ReadJSONL(filepath.Join(l.dir, e.Name()))
		if err != nil {
			return nil, err
		}
		all = append(all, records...)
	}
	return all, nil
}

// GetContext returns the most recent entries formatted for the system prompt.
func (l *WorkingLayer) GetContext(maxChars int) string {
	entries, err := l.ReadWindow()
	if err != nil || len(entries) == 0 {
		return ""
	}

	// Sort by timestamp descending (most recent first).
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Timestamp.After(entries[j].Timestamp)
	})

	var b []byte
	b = append(b, "## Working Memory (Last "+time.Duration(time.Duration(l.retentionDays)*24*time.Hour).String()+" window)\n\n"...)

	for _, e := range entries {
		line := "- [" + e.Timestamp.Format("2006-01-02") + "] " + e.Content + "\n"
		if maxChars > 0 && len(b)+len(line) > maxChars {
			break
		}
		b = append(b, line...)
	}
	return string(b)
}

// Prune removes entries by ID across all monthly files.
func (l *WorkingLayer) Prune(ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	idSet := make(map[string]bool, len(ids))
	for _, id := range ids {
		idSet[id] = true
	}

	dirEntries, err := os.ReadDir(l.dir)
	if err != nil {
		return err
	}

	for _, de := range dirEntries {
		if de.IsDir() || filepath.Ext(de.Name()) != ".jsonl" {
			continue
		}
		path := filepath.Join(l.dir, de.Name())
		records, err := ReadJSONL(path)
		if err != nil {
			return err
		}
		var kept []MemoryEntry
		changed := false
		for _, r := range records {
			if idSet[r.ID] {
				changed = true
			} else {
				kept = append(kept, r)
			}
		}
		if changed {
			if err := WriteJSONL(path, kept); err != nil {
				return err
			}
		}
	}
	return nil
}

// Replace rewrites all working memory with the given entries.
// Used after consolidation to replace working memory with survivors.
func (l *WorkingLayer) Replace(entries []MemoryEntry) error {
	// Remove all existing files.
	dirEntries, err := os.ReadDir(l.dir)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	for _, de := range dirEntries {
		if de.IsDir() || filepath.Ext(de.Name()) != ".jsonl" {
			continue
		}
		os.Remove(filepath.Join(l.dir, de.Name()))
	}

	// Group by month and write.
	byMonth := make(map[string][]MemoryEntry)
	for _, e := range entries {
		month := e.Timestamp.Format("200601")
		byMonth[month] = append(byMonth[month], e)
	}
	for month, records := range byMonth {
		path := filepath.Join(l.dir, month+".jsonl")
		if err := WriteJSONL(path, records); err != nil {
			return err
		}
	}
	return nil
}

// EntryCount returns the total number of entries in the retention window.
func (l *WorkingLayer) EntryCount() int {
	entries, _ := l.ReadWindow()
	return len(entries)
}
