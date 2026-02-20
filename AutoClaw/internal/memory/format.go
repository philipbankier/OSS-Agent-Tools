package memory

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// MemoryEntry is the universal entry format for working memory and preferences.
// Stored as one JSON line per entry in JSONL files.
type MemoryEntry struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	Salience  float64   `json:"salience"`            // 0.0 - 1.0
	Timestamp time.Time `json:"timestamp"`
	Source    string    `json:"source"`              // "agent"|"user"|"consolidation"|"import"
	Tags     []string  `json:"tags,omitempty"`
	Layer    string    `json:"layer"`               // "working"|"preferences"
}

// PerformanceMetric tracks success/failure for a tool or skill.
type PerformanceMetric struct {
	ToolOrSkill string `json:"tool_or_skill"`
	Successes   int    `json:"successes"`
	Failures    int    `json:"failures"`
	LastUsed    string `json:"last_used"` // ISO8601
}

// PerformanceData is the top-level structure for metrics.json.
type PerformanceData struct {
	UpdatedAt string              `json:"updated_at"`
	Metrics   []PerformanceMetric `json:"metrics"`
}

// PreferencesMeta tracks versioning for the preferences layer.
type PreferencesMeta struct {
	CurrentVersion    int    `json:"current_version"`
	LastConsolidation string `json:"last_consolidation"` // ISO8601
	TotalEntries      int    `json:"total_entries"`
}

// DiffEntry describes a difference between two preference snapshots.
type DiffEntry struct {
	Type  string      `json:"type"` // "added"|"removed"|"changed"
	Entry MemoryEntry `json:"entry"`
}

// TieredStatus holds summary information for all memory layers.
type TieredStatus struct {
	ConstitutionPrinciples int    `json:"constitution_principles"`
	ConstitutionTaboos     int    `json:"constitution_taboos"`
	PreferencesEntries     int    `json:"preferences_entries"`
	PreferencesVersion     int    `json:"preferences_version"`
	LastConsolidation      string `json:"last_consolidation"`
	WorkingEntries         int    `json:"working_entries"`
	WorkingOldest          string `json:"working_oldest"`
	PerformanceTools       int    `json:"performance_tools"`
	PerformanceAvgSuccess  float64 `json:"performance_avg_success"`
}

// --- JSONL helpers ---

// ReadJSONL reads all MemoryEntry records from a JSONL file.
func ReadJSONL(path string) ([]MemoryEntry, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	defer f.Close()

	var entries []MemoryEntry
	scanner := bufio.NewScanner(f)
	// Allow lines up to 1MB.
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		if line == "" {
			continue
		}
		var e MemoryEntry
		if err := json.Unmarshal([]byte(line), &e); err != nil {
			return nil, fmt.Errorf("line %d: %w", lineNum, err)
		}
		entries = append(entries, e)
	}
	return entries, scanner.Err()
}

// AppendJSONL appends a single MemoryEntry to a JSONL file.
func AppendJSONL(path string, entry MemoryEntry) error {
	data, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	data = append(data, '\n')

	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = f.Write(data)
	return err
}

// WriteJSONL writes a full set of MemoryEntry records to a JSONL file, replacing contents.
func WriteJSONL(path string, entries []MemoryEntry) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	w := bufio.NewWriter(f)
	for _, e := range entries {
		data, err := json.Marshal(e)
		if err != nil {
			return err
		}
		w.Write(data)
		w.WriteByte('\n')
	}
	return w.Flush()
}

// GenerateEntryID creates a unique ID for a memory entry.
func GenerateEntryID() string {
	return fmt.Sprintf("mem_%d", time.Now().UnixNano())
}
