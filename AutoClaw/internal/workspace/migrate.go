package workspace

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

// MigrateFromPicoClaw reads an existing PicoClaw workspace (flat markdown)
// and generates a minimal TasteKit ConstitutionV1 artifact from it.
// This enables existing PicoClaw users to adopt TasteKit incrementally.
func MigrateFromPicoClaw(workspaceDir string) (*artifact.ConstitutionV1, error) {
	c := &artifact.ConstitutionV1{
		SchemaVersion:    "constitution.v1",
		GeneratedAt:      time.Now().UTC(),
		GeneratorVersion: "migration-0.1.0",
		UserScope:        "migrated",
		Principles:       []artifact.ConstitutionPrinciple{},
		Tone: artifact.ConstitutionTone{
			VoiceKeywords:    []string{},
			ForbiddenPhrases: []string{},
			FormattingRules:  []string{},
		},
		Tradeoffs: artifact.ConstitutionTradeoffs{
			AccuracyVsSpeed: 0.5,
			CostSensitivity: 0.5,
			AutonomyLevel:   0.5,
		},
		EvidencePolicy: artifact.ConstitutionEvidencePolicy{
			RequireCitationsFor:      []string{},
			UncertaintyLanguageRules: []string{},
		},
		Taboos: artifact.ConstitutionTaboos{
			NeverDo:      []string{},
			MustEscalate: []string{},
		},
	}

	// Extract principles from SOUL.md.
	soulPath := filepath.Join(workspaceDir, "SOUL.md")
	if data, err := os.ReadFile(soulPath); err == nil {
		principles := extractBulletPoints(string(data))
		for i, p := range principles {
			c.Principles = append(c.Principles, artifact.ConstitutionPrinciple{
				ID:        fmt.Sprintf("migrated-%d", i+1),
				Priority:  i + 1,
				Statement: p,
				AppliesTo: []string{"all"},
			})
		}
	}

	// Extract tone keywords from SOUL.md personality section.
	if data, err := os.ReadFile(soulPath); err == nil {
		personality := extractSection(string(data), "Personality")
		for _, line := range extractBulletPoints(personality) {
			c.Tone.VoiceKeywords = append(c.Tone.VoiceKeywords, strings.ToLower(strings.TrimSpace(line)))
		}
	}

	// Ensure at least one principle.
	if len(c.Principles) == 0 {
		c.Principles = append(c.Principles, artifact.ConstitutionPrinciple{
			ID:        "migrated-default",
			Priority:  1,
			Statement: "Be helpful, accurate, and respectful.",
			AppliesTo: []string{"all"},
		})
	}

	return c, nil
}

// extractBulletPoints returns all lines starting with "- " in the input.
func extractBulletPoints(text string) []string {
	var points []string
	for _, line := range strings.Split(text, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "- ") {
			points = append(points, strings.TrimPrefix(trimmed, "- "))
		}
	}
	return points
}

// extractSection returns the content between a markdown header and the next header.
func extractSection(text, header string) string {
	lines := strings.Split(text, "\n")
	inSection := false
	var section []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "#") && strings.Contains(trimmed, header) {
			inSection = true
			continue
		}
		if inSection && strings.HasPrefix(trimmed, "#") {
			break
		}
		if inSection {
			section = append(section, line)
		}
	}
	return strings.Join(section, "\n")
}
