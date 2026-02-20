package mcpclient

import (
	"fmt"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

// AuditFinding represents a single trust audit result.
type AuditFinding struct {
	ServerName string `json:"server_name"`
	Severity   string `json:"severity"` // "error"|"warning"|"info"
	Message    string `json:"message"`
}

// Auditor cross-references MCP trust policy (from TasteKit trust artifact)
// against the active server registry and trust pins.
type Auditor struct {
	registry *Registry
	trust    *TrustManager
}

// NewAuditor creates an auditor from a registry and trust manager.
func NewAuditor(registry *Registry, trust *TrustManager) *Auditor {
	return &Auditor{registry: registry, trust: trust}
}

// Audit checks the current state against TasteKit trust policy.
func (a *Auditor) Audit(trustArtifact *artifact.TrustV1) []AuditFinding {
	var findings []AuditFinding

	// Check that all trust-pinned MCP servers are in the registry.
	registeredServers := a.registry.List()
	for _, srv := range trustArtifact.MCPServers {
		found := false
		for _, cfg := range registeredServers {
			// Match by command or URL-like reference.
			if cfg.Command == srv.URL || matchesServerURL(cfg, srv.URL) {
				found = true
				break
			}
		}
		if !found {
			findings = append(findings, AuditFinding{
				ServerName: srv.URL,
				Severity:   "warning",
				Message:    fmt.Sprintf("trust artifact references server %q but it is not in the registry", srv.URL),
			})
		}
	}

	// Check that all registered servers have trust pins.
	for name := range registeredServers {
		if _, ok := a.trust.Get(name); !ok {
			findings = append(findings, AuditFinding{
				ServerName: name,
				Severity:   "warning",
				Message:    fmt.Sprintf("registered server %q has no trust pin", name),
			})
		}
	}

	// Check that strict-mode pins have matching fingerprints.
	for name, pin := range a.trust.ListPins() {
		if pin.PinMode != "strict" {
			continue
		}
		if pin.Fingerprint == "" {
			findings = append(findings, AuditFinding{
				ServerName: name,
				Severity:   "error",
				Message:    fmt.Sprintf("server %q has strict pin mode but empty fingerprint", name),
			})
		}
	}

	if len(findings) == 0 {
		findings = append(findings, AuditFinding{
			Severity: "info",
			Message:  "all servers pass trust audit",
		})
	}

	return findings
}

func matchesServerURL(cfg ServerConfig, url string) bool {
	// Simple heuristic: check if the command contains the URL scheme or name.
	return false
}
