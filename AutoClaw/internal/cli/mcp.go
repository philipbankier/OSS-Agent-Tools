package cli

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/philipbankier/autoclaw/internal/artifact"
	"github.com/philipbankier/autoclaw/internal/mcpclient"
)

// MCPListCmd lists all registered MCP servers.
func MCPListCmd(mcpDir string) error {
	registryPath := filepath.Join(mcpDir, "servers.json")
	registry, err := mcpclient.NewRegistry(registryPath)
	if err != nil {
		return fmt.Errorf("load registry: %w", err)
	}

	servers := registry.List()
	if len(servers) == 0 {
		fmt.Println("No MCP servers registered.")
		fmt.Println("Use 'autoclaw mcp pin <name> <fingerprint>' to add a trusted server.")
		return nil
	}

	fmt.Printf("%d registered MCP server(s):\n\n", len(servers))
	for name, cfg := range servers {
		fmt.Printf("  %-20s  %s\n", name, cfg.Command)
		if cfg.Version != "" {
			fmt.Printf("  %-20s  version: %s\n", "", cfg.Version)
		}
		fmt.Printf("  %-20s  trust: %s\n", "", cfg.Trust)
		fmt.Println()
	}
	return nil
}

// MCPPinCmd creates or updates a trust pin for an MCP server.
func MCPPinCmd(mcpDir, serverName, fingerprint, mode string) error {
	if mode == "" {
		mode = "strict"
	}
	if mode != "strict" && mode != "warn" {
		return fmt.Errorf("invalid pin mode %q: must be 'strict' or 'warn'", mode)
	}

	trustPath := filepath.Join(mcpDir, "trust.json")
	trust, err := mcpclient.NewTrustManager(trustPath)
	if err != nil {
		return fmt.Errorf("load trust manager: %w", err)
	}

	pin := mcpclient.TrustPin{
		Fingerprint: fingerprint,
		PinMode:     mode,
		PinnedAt:    time.Now().UTC().Format(time.RFC3339),
	}

	if err := trust.Pin(serverName, pin); err != nil {
		return fmt.Errorf("pin server: %w", err)
	}

	fmt.Printf("Pinned server %q with fingerprint %s (mode: %s)\n", serverName, fingerprint, mode)
	return nil
}

// MCPAuditCmd runs a trust audit comparing the MCP registry, trust pins,
// and TasteKit trust artifact.
func MCPAuditCmd(mcpDir, tastekitDir string) error {
	registryPath := filepath.Join(mcpDir, "servers.json")
	registry, err := mcpclient.NewRegistry(registryPath)
	if err != nil {
		return fmt.Errorf("load registry: %w", err)
	}

	trustPath := filepath.Join(mcpDir, "trust.json")
	trust, err := mcpclient.NewTrustManager(trustPath)
	if err != nil {
		return fmt.Errorf("load trust manager: %w", err)
	}

	// Load TasteKit trust artifact.
	trustArtifactPath := filepath.Join(tastekitDir, "artifacts", "trust.v1.yaml")
	trustArtifact, err := artifact.LoadTrust(trustArtifactPath)
	if err != nil {
		return fmt.Errorf("load trust artifact: %w", err)
	}

	auditor := mcpclient.NewAuditor(registry, trust)
	findings := auditor.Audit(trustArtifact)

	fmt.Printf("MCP Trust Audit (%d finding(s)):\n\n", len(findings))
	for _, f := range findings {
		badge := severityBadge(f.Severity)
		server := f.ServerName
		if server == "" {
			server = "(global)"
		}
		fmt.Printf("  [%s] %s: %s\n", badge, server, f.Message)
	}
	fmt.Println()
	return nil
}

func severityBadge(severity string) string {
	switch severity {
	case "error":
		return "ERR "
	case "warning":
		return "WARN"
	default:
		return "INFO"
	}
}
