package cli

import (
	"fmt"
	"strconv"

	"github.com/philipbankier/autoclaw/internal/artifact"
	"github.com/philipbankier/autoclaw/internal/memory"
)

// MemoryStatusCmd displays a summary of all four memory layers.
func MemoryStatusCmd(workspaceDir, tastekitDir string) error {
	ws, err := artifact.LoadWorkspace(tastekitDir)
	if err != nil {
		return fmt.Errorf("load TasteKit workspace: %w", err)
	}

	store, err := memory.NewTieredMemoryStore(workspaceDir, ws)
	if err != nil {
		return fmt.Errorf("init tiered memory: %w", err)
	}

	status := store.Status()

	fmt.Println("Memory Status (tiered mode)")
	fmt.Println()
	fmt.Printf("  Constitution:  %d principles, %d taboos (read-only, from TasteKit)\n",
		status.ConstitutionPrinciples, status.ConstitutionTaboos)
	fmt.Printf("  Preferences:   %d entries, version %d",
		status.PreferencesEntries, status.PreferencesVersion)
	if status.LastConsolidation != "" {
		fmt.Printf(" (last consolidation: %s)", status.LastConsolidation[:10])
	}
	fmt.Println()
	fmt.Printf("  Working:       %d entries", status.WorkingEntries)
	if status.WorkingOldest != "" {
		fmt.Printf(" (oldest: %s)", status.WorkingOldest)
	}
	fmt.Println()
	fmt.Printf("  Performance:   %d tools tracked", status.PerformanceTools)
	if status.PerformanceTools > 0 {
		fmt.Printf(", avg %.0f%% success rate", status.PerformanceAvgSuccess*100)
	}
	fmt.Println()

	return nil
}

// MemoryConsolidateCmd runs or previews memory consolidation.
func MemoryConsolidateCmd(workspaceDir, tastekitDir string, dryRun bool) error {
	ws, err := artifact.LoadWorkspace(tastekitDir)
	if err != nil {
		return fmt.Errorf("load TasteKit workspace: %w", err)
	}

	store, err := memory.NewTieredMemoryStore(workspaceDir, ws)
	if err != nil {
		return fmt.Errorf("init tiered memory: %w", err)
	}

	if dryRun {
		plan, err := store.PreviewConsolidation()
		if err != nil {
			return fmt.Errorf("preview consolidation: %w", err)
		}

		fmt.Println("Consolidation Preview (dry-run):")
		fmt.Printf("  Keep:    %d entries\n", len(plan.MemoriesToKeep))
		fmt.Printf("  Prune:   %d entries\n", len(plan.MemoriesToPrune))
		fmt.Printf("  Merge:   %d groups\n", len(plan.MemoriesToMerge))
		fmt.Println()
		fmt.Println("No changes made. Run without --dry-run to apply.")
		return nil
	}

	result, err := store.RunConsolidation()
	if err != nil {
		return fmt.Errorf("run consolidation: %w", err)
	}

	fmt.Println("Consolidation Complete:")
	fmt.Printf("  Snapshot:     v%d (preferences backed up)\n", result.SnapshotVer)
	fmt.Printf("  Pruned:       %d entries removed\n", result.Pruned)
	fmt.Printf("  Merged:       %d groups consolidated\n", result.Merged)
	fmt.Printf("  Promoted:     %d entries moved to preferences\n", result.Promoted)
	fmt.Printf("  Working:      %d -> %d entries\n", result.WorkingBefore, result.WorkingAfter)
	fmt.Printf("  Preferences:  %d -> %d entries\n", result.PrefsBefore, result.PrefsAfter)
	return nil
}

// MemoryRollbackCmd restores preferences to a previous snapshot version.
func MemoryRollbackCmd(workspaceDir, tastekitDir string, version int) error {
	ws, err := artifact.LoadWorkspace(tastekitDir)
	if err != nil {
		return fmt.Errorf("load TasteKit workspace: %w", err)
	}

	store, err := memory.NewTieredMemoryStore(workspaceDir, ws)
	if err != nil {
		return fmt.Errorf("init tiered memory: %w", err)
	}

	if err := store.Preferences.Rollback(version); err != nil {
		return fmt.Errorf("rollback: %w", err)
	}

	fmt.Printf("Preferences restored to snapshot v%03d.\n", version)
	return nil
}

// MemoryDiffCmd shows differences between two preference snapshots.
func MemoryDiffCmd(workspaceDir, tastekitDir string, vA, vB int) error {
	ws, err := artifact.LoadWorkspace(tastekitDir)
	if err != nil {
		return fmt.Errorf("load TasteKit workspace: %w", err)
	}

	store, err := memory.NewTieredMemoryStore(workspaceDir, ws)
	if err != nil {
		return fmt.Errorf("init tiered memory: %w", err)
	}

	diffs, err := store.Preferences.Diff(vA, vB)
	if err != nil {
		return fmt.Errorf("diff: %w", err)
	}

	if len(diffs) == 0 {
		fmt.Printf("No differences between v%03d and v%03d.\n", vA, vB)
		return nil
	}

	fmt.Printf("Differences between v%03d and v%03d (%d changes):\n\n", vA, vB, len(diffs))
	for _, d := range diffs {
		switch d.Type {
		case "added":
			fmt.Printf("  + [%.2f] %s\n", d.Entry.Salience, d.Entry.Content)
		case "removed":
			fmt.Printf("  - [%.2f] %s\n", d.Entry.Salience, d.Entry.Content)
		case "changed":
			fmt.Printf("  ~ [%.2f] %s\n", d.Entry.Salience, d.Entry.Content)
		}
	}
	return nil
}

// ParseVersion parses a version string (e.g. "3") to an int.
func ParseVersion(s string) (int, error) {
	v, err := strconv.Atoi(s)
	if err != nil {
		return 0, fmt.Errorf("invalid version %q: expected a number", s)
	}
	return v, nil
}
