// Package workspace generates PicoClaw/AutoClaw workspace markdown files
// from compiled TasteKit artifacts. This is the bridge between TasteKit's
// structured artifact format and PicoClaw's flat markdown context system.
package workspace

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

// Generator produces workspace markdown files from TasteKit artifacts.
type Generator struct {
	ws *artifact.Workspace
}

// NewGenerator creates a workspace generator from loaded artifacts.
func NewGenerator(ws *artifact.Workspace) *Generator {
	return &Generator{ws: ws}
}

// GenerateAll writes all workspace markdown files to the given directory.
func (g *Generator) GenerateAll(outDir string) error {
	files := map[string]func() string{
		"SOUL.md":     g.GenerateSoulMD,
		"IDENTITY.md": g.GenerateIdentityMD,
		"AGENTS.md":   g.GenerateAgentsMD,
		"USER.md":     g.GenerateUserMD,
	}
	for name, fn := range files {
		content := fn()
		path := filepath.Join(outDir, name)
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			return fmt.Errorf("write %s: %w", name, err)
		}
	}
	return nil
}

// GenerateSoulMD generates the SOUL.md file from constitution principles and taboos.
func (g *Generator) GenerateSoulMD() string {
	c := g.ws.Constitution
	var b strings.Builder

	b.WriteString("# Soul\n\n")

	// Core principles
	b.WriteString("## Principles\n\n")
	for _, p := range c.Principles {
		b.WriteString(fmt.Sprintf("- **%s**: %s\n", p.ID, p.Statement))
		if p.Rationale != nil {
			b.WriteString(fmt.Sprintf("  - _Rationale_: %s\n", *p.Rationale))
		}
	}

	// Tone
	b.WriteString("\n## Voice & Tone\n\n")
	if len(c.Tone.VoiceKeywords) > 0 {
		b.WriteString("Keywords: " + strings.Join(c.Tone.VoiceKeywords, ", ") + "\n\n")
	}
	if len(c.Tone.ForbiddenPhrases) > 0 {
		b.WriteString("Never use: " + strings.Join(c.Tone.ForbiddenPhrases, ", ") + "\n\n")
	}
	if len(c.Tone.FormattingRules) > 0 {
		b.WriteString("Formatting:\n")
		for _, r := range c.Tone.FormattingRules {
			b.WriteString("- " + r + "\n")
		}
	}

	// Taboos
	if len(c.Taboos.NeverDo) > 0 || len(c.Taboos.MustEscalate) > 0 {
		b.WriteString("\n## Boundaries\n\n")
		if len(c.Taboos.NeverDo) > 0 {
			b.WriteString("### Never Do\n")
			for _, t := range c.Taboos.NeverDo {
				b.WriteString("- " + t + "\n")
			}
		}
		if len(c.Taboos.MustEscalate) > 0 {
			b.WriteString("\n### Must Escalate\n")
			for _, t := range c.Taboos.MustEscalate {
				b.WriteString("- " + t + "\n")
			}
		}
	}

	// Evidence policy
	if len(c.EvidencePolicy.RequireCitationsFor) > 0 || len(c.EvidencePolicy.UncertaintyLanguageRules) > 0 {
		b.WriteString("\n## Evidence Policy\n\n")
		if len(c.EvidencePolicy.RequireCitationsFor) > 0 {
			b.WriteString("Require citations for: " + strings.Join(c.EvidencePolicy.RequireCitationsFor, ", ") + "\n\n")
		}
		for _, r := range c.EvidencePolicy.UncertaintyLanguageRules {
			b.WriteString("- " + r + "\n")
		}
	}

	return b.String()
}

// GenerateIdentityMD generates IDENTITY.md from constitution metadata.
func (g *Generator) GenerateIdentityMD() string {
	c := g.ws.Constitution
	var b strings.Builder

	b.WriteString("# Identity\n\n")
	b.WriteString(fmt.Sprintf("## Scope\n%s\n\n", c.UserScope))

	b.WriteString("## Tradeoffs\n\n")
	b.WriteString(fmt.Sprintf("- Accuracy vs Speed: %.1f (higher = more accurate)\n", c.Tradeoffs.AccuracyVsSpeed))
	b.WriteString(fmt.Sprintf("- Cost Sensitivity: %.1f (higher = more cost-conscious)\n", c.Tradeoffs.CostSensitivity))
	b.WriteString(fmt.Sprintf("- Autonomy Level: %.1f (higher = more autonomous)\n", c.Tradeoffs.AutonomyLevel))

	b.WriteString(fmt.Sprintf("\n## Generator\nVersion: %s\n", c.GeneratorVersion))

	return b.String()
}

// GenerateAgentsMD generates AGENTS.md from guardrails and skills.
func (g *Generator) GenerateAgentsMD() string {
	var b strings.Builder

	b.WriteString("# Agent Instructions\n\n")

	// Guardrails permissions
	if g.ws.Guardrails != nil && len(g.ws.Guardrails.Permissions) > 0 {
		b.WriteString("## Permissions\n\n")
		for _, p := range g.ws.Guardrails.Permissions {
			b.WriteString(fmt.Sprintf("- **%s** (%s): %s on %s\n",
				p.ScopeID, p.ToolRef,
				strings.Join(p.Ops, ", "),
				strings.Join(p.Resources, ", ")))
		}
	}

	// Approval rules
	if g.ws.Guardrails != nil && len(g.ws.Guardrails.Approvals) > 0 {
		b.WriteString("\n## Approval Rules\n\n")
		for _, a := range g.ws.Guardrails.Approvals {
			b.WriteString(fmt.Sprintf("- **%s**: When `%s` → %s (via %s)\n",
				a.RuleID, a.When, a.Action, a.Channel))
		}
	}

	// Rate limits
	if g.ws.Guardrails != nil && len(g.ws.Guardrails.RateLimits) > 0 {
		b.WriteString("\n## Rate Limits\n\n")
		for _, r := range g.ws.Guardrails.RateLimits {
			b.WriteString(fmt.Sprintf("- %s: %d per %s\n", r.ToolRef, r.Limit, r.Window))
		}
	}

	// Skills
	if g.ws.Skills != nil && len(g.ws.Skills.Skills) > 0 {
		b.WriteString("\n## Available Skills\n\n")
		for _, s := range g.ws.Skills.Skills {
			b.WriteString(fmt.Sprintf("- **%s** (%s): %s [risk: %s]\n",
				s.Name, s.SkillID, s.Description, s.RiskLevel))
		}
	}

	return b.String()
}

// GenerateUserMD generates USER.md from constitution user scope and memory policy.
func (g *Generator) GenerateUserMD() string {
	c := g.ws.Constitution
	var b strings.Builder

	b.WriteString("# User\n\n")
	b.WriteString(fmt.Sprintf("## Scope\n%s\n\n", c.UserScope))

	// Memory policy
	if g.ws.Memory != nil {
		m := g.ws.Memory
		b.WriteString("## Memory Policy\n\n")
		b.WriteString(fmt.Sprintf("- Update mode: %s\n", m.WritePolicy.UpdateMode))
		if m.WritePolicy.ConsolidationSchedule != nil {
			b.WriteString(fmt.Sprintf("- Consolidation: %s\n", *m.WritePolicy.ConsolidationSchedule))
		}
		b.WriteString(fmt.Sprintf("- PII detection: %v\n", m.WritePolicy.PIIHandling.Detect))
		b.WriteString(fmt.Sprintf("- PII redaction: %v\n", m.WritePolicy.PIIHandling.Redact))
		if m.RetentionPolicy.TTLDays != nil {
			b.WriteString(fmt.Sprintf("- Retention: %d days (%s)\n", *m.RetentionPolicy.TTLDays, m.RetentionPolicy.PruneStrategy))
		}
	}

	return b.String()
}

// GenerateToolsMD generates TOOLS.md from bindings (for MCP-aware workspace).
func (g *Generator) GenerateToolsMD() string {
	if g.ws.Bindings == nil || len(g.ws.Bindings.Servers) == 0 {
		return "# Tools\n\nNo MCP tools configured.\n"
	}

	var b strings.Builder
	b.WriteString("# Tools\n\n")

	for _, s := range g.ws.Bindings.Servers {
		b.WriteString(fmt.Sprintf("## %s\n", s.Name))
		b.WriteString(fmt.Sprintf("URL: `%s`\n\n", s.URL))
		if len(s.Tools) > 0 {
			b.WriteString("Tools:\n")
			for _, t := range s.Tools {
				b.WriteString(fmt.Sprintf("- `%s`", t.ToolRef))
				if len(t.RiskHints) > 0 {
					b.WriteString(fmt.Sprintf(" (risk: %s)", strings.Join(t.RiskHints, ", ")))
				}
				b.WriteString("\n")
			}
		}
		b.WriteString("\n")
	}

	return b.String()
}
