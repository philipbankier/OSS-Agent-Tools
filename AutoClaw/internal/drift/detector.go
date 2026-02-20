// Package drift implements behavioral drift detection and memory consolidation.
// Ported from TasteKit's TypeScript implementation with identical algorithms
// and thresholds for cross-runtime compatibility.
package drift

import (
	"fmt"
	"time"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

// DriftSignal represents a detected behavioral pattern.
type DriftSignal struct {
	Type      string `json:"type"` // "repeated_edit"|"principle_violation"|"user_correction"|"tool_change"
	Frequency int    `json:"frequency"`
	Context   any    `json:"context"`
}

// DetectionOptions controls drift analysis scope.
type DetectionOptions struct {
	Since   *time.Time // Only analyze events after this time.
	SkillID string     // Filter to a specific skill.
}

// Detector analyzes trace events for drift patterns.
type Detector struct{}

// NewDetector creates a drift detector.
func NewDetector() *Detector {
	return &Detector{}
}

// DetectFromTraces analyzes trace events and returns drift proposals.
// Algorithm matches TasteKit's TypeScript: threshold = 3+ occurrences,
// risk rating = >10 high / >5 medium / else low.
func (d *Detector) DetectFromTraces(events []artifact.TraceEvent, opts DetectionOptions) []DriftProposal {
	filtered := d.filterEvents(events, opts)
	signals := d.detectSignals(filtered)
	return d.generateProposals(signals)
}

// filterEvents applies time and skill filters.
func (d *Detector) filterEvents(events []artifact.TraceEvent, opts DetectionOptions) []artifact.TraceEvent {
	var filtered []artifact.TraceEvent
	for _, e := range events {
		if opts.Since != nil {
			t, err := time.Parse(time.RFC3339, e.Timestamp)
			if err != nil {
				continue
			}
			if t.Before(*opts.Since) {
				continue
			}
		}
		if opts.SkillID != "" && (e.SkillID == nil || *e.SkillID != opts.SkillID) {
			continue
		}
		filtered = append(filtered, e)
	}
	return filtered
}

// detectSignals identifies drift patterns from events.
func (d *Detector) detectSignals(events []artifact.TraceEvent) []DriftSignal {
	var signals []DriftSignal

	// Signal 1: Repeated rejections (approval_response with approved=false).
	rejectionReasons := make(map[string]int)
	for _, e := range events {
		if e.EventType != "approval_response" {
			continue
		}
		if e.Data == nil {
			continue
		}
		approved, ok := e.Data["approved"]
		if !ok {
			continue
		}
		if b, ok := approved.(bool); ok && b {
			continue
		}
		reason := "unspecified"
		if r, ok := e.Data["reason"].(string); ok && r != "" {
			reason = r
		}
		rejectionReasons[reason]++
	}
	for reason, count := range rejectionReasons {
		signals = append(signals, DriftSignal{
			Type:      "repeated_edit",
			Frequency: count,
			Context:   map[string]any{"reason": reason},
		})
	}

	// Signal 2: Error accumulation (principle violations).
	var errors []string
	for _, e := range events {
		if e.EventType != "error" {
			continue
		}
		errMsg := "unknown error"
		if e.Error != nil {
			errMsg = *e.Error
		}
		errors = append(errors, errMsg)
	}
	if len(errors) > 0 {
		sample := errors
		if len(sample) > 5 {
			sample = sample[:5]
		}
		signals = append(signals, DriftSignal{
			Type:      "principle_violation",
			Frequency: len(errors),
			Context:   map[string]any{"errors": sample},
		})
	}

	return signals
}

// generateProposals converts signals into actionable proposals.
// Only signals with frequency >= 3 generate proposals (matches TasteKit).
func (d *Detector) generateProposals(signals []DriftSignal) []DriftProposal {
	var proposals []DriftProposal
	for _, sig := range signals {
		if sig.Frequency < 3 {
			continue
		}
		proposal := DriftProposal{
			ProposalID: fmt.Sprintf("drift_%d_%s", time.Now().UnixMilli(), sig.Type),
			CreatedAt:  time.Now().UTC().Format(time.RFC3339),
			SignalType: sig.Type,
			Frequency:  sig.Frequency,
			RiskRating: riskRating(sig.Frequency),
			Evidence:   sig.Context,
		}

		switch sig.Type {
		case "repeated_edit":
			reason := "unknown"
			if ctx, ok := sig.Context.(map[string]any); ok {
				if r, ok := ctx["reason"].(string); ok {
					reason = r
				}
			}
			proposal.Rationale = fmt.Sprintf("Agent actions were rejected %d times for: %s", sig.Frequency, reason)
			proposal.ProposedChanges = map[string]any{
				"constitution": map[string]any{
					"add_principle": map[string]any{
						"statement": fmt.Sprintf("Avoid: %s", reason),
						"priority":  10,
					},
				},
			}
		case "principle_violation":
			proposal.Rationale = fmt.Sprintf("%d errors detected, suggesting guardrail gaps", sig.Frequency)
			proposal.ProposedChanges = map[string]any{
				"guardrails": map[string]any{
					"review_required": true,
				},
			}
		}

		proposals = append(proposals, proposal)
	}
	return proposals
}

// riskRating matches TasteKit's thresholds: >10 high, >5 medium, else low.
func riskRating(frequency int) string {
	if frequency > 10 {
		return "high"
	}
	if frequency > 5 {
		return "medium"
	}
	return "low"
}
