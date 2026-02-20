package memory

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

// TieredMemoryStore implements agent.MemoryProvider with four memory layers.
// When TasteKit is configured, this replaces the flat MemoryStore.
type TieredMemoryStore struct {
	mu           sync.RWMutex
	baseDir      string // workspace/memory/tiered/
	Constitution *ConstitutionLayer
	Preferences  *PreferencesLayer
	Working      *WorkingLayer
	Performance  *PerformanceLayer
	memoryPolicy *artifact.MemoryV1
}

// NewTieredMemoryStore creates and initializes the four-layer memory system.
func NewTieredMemoryStore(workspaceDir string, ws *artifact.Workspace) (*TieredMemoryStore, error) {
	baseDir := filepath.Join(workspaceDir, "memory", "tiered")
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		return nil, fmt.Errorf("create tiered dir: %w", err)
	}

	store := &TieredMemoryStore{baseDir: baseDir}

	// Constitution layer (from artifact).
	store.Constitution = NewConstitutionLayer(ws.Constitution)

	// Preferences layer.
	prefsDir := filepath.Join(baseDir, "preferences")
	prefs, err := NewPreferencesLayer(prefsDir)
	if err != nil {
		return nil, fmt.Errorf("init preferences: %w", err)
	}
	store.Preferences = prefs

	// Working memory layer.
	workingDir := filepath.Join(baseDir, "working")
	var retention *artifact.MemoryRetentionPolicy
	if ws.Memory != nil {
		retention = &ws.Memory.RetentionPolicy
	}
	store.Working = NewWorkingLayer(workingDir, retention)

	// Performance layer.
	perfPath := filepath.Join(baseDir, "performance", "metrics.json")
	perf, err := NewPerformanceLayer(perfPath)
	if err != nil {
		return nil, fmt.Errorf("init performance: %w", err)
	}
	store.Performance = perf

	// Store memory policy for consolidation.
	if ws.Memory != nil {
		store.memoryPolicy = ws.Memory
	}

	return store, nil
}

// GetMemoryContext satisfies agent.MemoryProvider.
// Budget allocation: constitution 10%, preferences 40%, working 40%, performance 10%.
func (t *TieredMemoryStore) GetMemoryContext() string {
	const totalBudget = 8000 // chars

	constitutionBudget := totalBudget / 10
	preferencesBudget := totalBudget * 4 / 10
	workingBudget := totalBudget * 4 / 10
	performanceBudget := totalBudget / 10

	var parts []string

	if ctx := t.Constitution.GetContext(constitutionBudget); ctx != "" {
		parts = append(parts, ctx)
	}
	if ctx := t.Preferences.GetContext(preferencesBudget); ctx != "" {
		parts = append(parts, ctx)
	}
	if ctx := t.Working.GetContext(workingBudget); ctx != "" {
		parts = append(parts, ctx)
	}
	if ctx := t.Performance.GetContext(performanceBudget); ctx != "" {
		parts = append(parts, ctx)
	}

	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, "\n")
}

// AppendWorkingMemory satisfies agent.MemoryProvider.
func (t *TieredMemoryStore) AppendWorkingMemory(content string, salience float64) error {
	return t.Working.Write(MemoryEntry{
		Content:  content,
		Salience: salience,
		Source:   "agent",
	})
}

// UpdateLongTermMemory satisfies agent.MemoryProvider.
// In tiered mode, this writes to the preferences layer.
func (t *TieredMemoryStore) UpdateLongTermMemory(content string) error {
	return t.Preferences.Write(MemoryEntry{
		Content:  content,
		Salience: 0.8,
		Source:   "user",
	})
}

// Status returns a summary of all four layers.
func (t *TieredMemoryStore) Status() TieredStatus {
	status := TieredStatus{
		ConstitutionPrinciples: t.Constitution.PrincipleCount(),
		ConstitutionTaboos:     t.Constitution.TabooCount(),
	}

	meta := t.Preferences.Meta()
	status.PreferencesEntries = meta.TotalEntries
	status.PreferencesVersion = meta.CurrentVersion
	status.LastConsolidation = meta.LastConsolidation

	status.WorkingEntries = t.Working.EntryCount()

	metrics := t.Performance.GetMetrics()
	status.PerformanceTools = len(metrics)
	status.PerformanceAvgSuccess = t.Performance.AvgSuccessRate()

	return status
}

// InitTieredDirs creates the tiered memory directory structure and initializes
// the constitution cache. Called during import-taste.
func InitTieredDirs(workspaceDir string, ws *artifact.Workspace) error {
	baseDir := filepath.Join(workspaceDir, "memory", "tiered")

	dirs := []string{
		filepath.Join(baseDir, "constitution"),
		filepath.Join(baseDir, "preferences", "snapshots"),
		filepath.Join(baseDir, "working"),
		filepath.Join(baseDir, "performance"),
	}
	for _, d := range dirs {
		if err := os.MkdirAll(d, 0o755); err != nil {
			return err
		}
	}

	// Write constitution cache.
	if ws.Constitution != nil {
		principlesPath := filepath.Join(baseDir, "constitution", "principles.json")
		data, err := json.MarshalIndent(ws.Constitution, "", "  ")
		if err != nil {
			return err
		}
		if err := os.WriteFile(principlesPath, data, 0o644); err != nil {
			return err
		}
	}

	// Initialize empty preferences meta.
	metaPath := filepath.Join(baseDir, "preferences", "meta.json")
	if _, err := os.Stat(metaPath); os.IsNotExist(err) {
		meta := PreferencesMeta{}
		data, _ := json.MarshalIndent(meta, "", "  ")
		os.WriteFile(metaPath, data, 0o644)
	}

	return nil
}
