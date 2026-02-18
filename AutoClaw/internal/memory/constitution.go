package memory

import (
	"fmt"
	"strings"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

// ConstitutionLayer provides read-only access to the immutable constitution.
// Loaded once from ConstitutionV1 artifact at construction; no file I/O at runtime.
type ConstitutionLayer struct {
	principles []artifact.ConstitutionPrinciple
	tone       artifact.ConstitutionTone
	taboos     artifact.ConstitutionTaboos
	evidence   artifact.ConstitutionEvidencePolicy
}

// NewConstitutionLayer creates a constitution layer from a loaded artifact.
func NewConstitutionLayer(c *artifact.ConstitutionV1) *ConstitutionLayer {
	if c == nil {
		return &ConstitutionLayer{}
	}
	return &ConstitutionLayer{
		principles: c.Principles,
		tone:       c.Tone,
		taboos:     c.Taboos,
		evidence:   c.EvidencePolicy,
	}
}

func (l *ConstitutionLayer) Name() string     { return "constitution" }
func (l *ConstitutionLayer) IsReadOnly() bool  { return true }

// GetContext formats principles, tone, and taboos for injection into the system prompt.
func (l *ConstitutionLayer) GetContext(maxChars int) string {
	var b strings.Builder

	b.WriteString("## Constitution (Immutable)\n\n")

	// Principles
	for i, p := range l.principles {
		line := fmt.Sprintf("%d. [%s] %s", i+1, p.ID, p.Statement)
		if p.Rationale != nil {
			line += fmt.Sprintf(" (%s)", *p.Rationale)
		}
		line += "\n"
		if b.Len()+len(line) > maxChars && maxChars > 0 {
			break
		}
		b.WriteString(line)
	}

	// Tone
	if len(l.tone.VoiceKeywords) > 0 {
		b.WriteString("\nVoice: " + strings.Join(l.tone.VoiceKeywords, ", ") + "\n")
	}
	if len(l.tone.ForbiddenPhrases) > 0 {
		b.WriteString("Never say: " + strings.Join(l.tone.ForbiddenPhrases, ", ") + "\n")
	}

	// Taboos
	if len(l.taboos.NeverDo) > 0 {
		b.WriteString("\nNever do:\n")
		for _, t := range l.taboos.NeverDo {
			b.WriteString("- " + t + "\n")
		}
	}
	if len(l.taboos.MustEscalate) > 0 {
		b.WriteString("\nMust escalate:\n")
		for _, t := range l.taboos.MustEscalate {
			b.WriteString("- " + t + "\n")
		}
	}

	return b.String()
}

// PrincipleCount returns the number of loaded principles.
func (l *ConstitutionLayer) PrincipleCount() int { return len(l.principles) }

// TabooCount returns the total number of taboos.
func (l *ConstitutionLayer) TabooCount() int {
	return len(l.taboos.NeverDo) + len(l.taboos.MustEscalate)
}
