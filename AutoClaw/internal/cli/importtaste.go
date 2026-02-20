package cli

import (
	"fmt"
	"os"

	"github.com/philipbankier/autoclaw/internal/artifact"
	"github.com/philipbankier/autoclaw/internal/memory"
	"github.com/philipbankier/autoclaw/internal/workspace"
)

// ImportTasteCmd loads TasteKit artifacts and generates workspace markdown files.
// This bridges TasteKit's structured artifacts to PicoClaw's flat markdown context.
func ImportTasteCmd(tastekitDir, workspaceDir string) error {
	// Load all TasteKit artifacts.
	ws, err := artifact.LoadWorkspace(tastekitDir)
	if err != nil {
		return fmt.Errorf("load TasteKit workspace: %w", err)
	}

	// Ensure output directory exists.
	if err := os.MkdirAll(workspaceDir, 0o755); err != nil {
		return fmt.Errorf("create workspace dir: %w", err)
	}

	// Generate workspace files.
	gen := workspace.NewGenerator(ws)
	if err := gen.GenerateAll(workspaceDir); err != nil {
		return fmt.Errorf("generate workspace: %w", err)
	}

	fmt.Printf("Imported TasteKit artifacts from %s\n", tastekitDir)
	fmt.Printf("Generated workspace files in %s:\n", workspaceDir)
	fmt.Println("  - SOUL.md       (principles, tone, taboos)")
	fmt.Println("  - IDENTITY.md   (scope, tradeoffs)")
	fmt.Println("  - AGENTS.md     (permissions, approvals, skills)")
	fmt.Println("  - USER.md       (user scope, memory policy)")

	// Generate TOOLS.md separately if bindings exist.
	if ws.Bindings != nil && len(ws.Bindings.Servers) > 0 {
		toolsMD := gen.GenerateToolsMD()
		toolsPath := workspaceDir + "/TOOLS.md"
		if err := os.WriteFile(toolsPath, []byte(toolsMD), 0o644); err != nil {
			return fmt.Errorf("write TOOLS.md: %w", err)
		}
		fmt.Println("  - TOOLS.md      (MCP tool bindings)")
	}

	// Initialize tiered memory directory structure if memory artifact exists.
	if ws.Memory != nil {
		if err := memory.InitTieredDirs(workspaceDir, ws); err != nil {
			return fmt.Errorf("init tiered memory dirs: %w", err)
		}
		fmt.Println("  - memory/tiered/ (four-layer memory structure)")
	}

	return nil
}
