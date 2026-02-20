package cli

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/philipbankier/autoclaw/pkg/config"
)

// parseDate parses a YYYY-MM-DD date string.
func parseDate(s string) (time.Time, error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, fmt.Errorf("expected YYYY-MM-DD format, got %q", s)
	}
	return t, nil
}

// ResolveTasteKitDir returns the TasteKit artifacts directory.
// Uses the config value if set, otherwise defaults to ~/.tastekit.
func ResolveTasteKitDir(cfg *config.Config) string {
	if cfg.TasteKit.ArtifactsDir != "" {
		return cfg.TasteKit.ArtifactsDir
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ".tastekit"
	}
	return filepath.Join(home, ".tastekit")
}

// ResolveMCPDir returns the MCP configuration directory.
// Defaults to ~/.autoclaw/.mcp/.
func ResolveMCPDir(cfg *config.Config) string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ".mcp"
	}
	return filepath.Join(home, ".autoclaw", ".mcp")
}
