// Package cli implements AutoClaw CLI subcommands for TasteKit integration.
// These are standalone functions called from cmd/autoclaw/main.go.
package cli

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/philipbankier/autoclaw/internal/artifact"
	"github.com/philipbankier/autoclaw/internal/drift"
)

// DriftDetectCmd runs drift detection on trace files.
// Usage: autoclaw drift detect [--since=YYYY-MM-DD] [--skill=ID]
func DriftDetectCmd(tastekitDir string, since, skillID string) error {
	tracesDir := filepath.Join(tastekitDir, "traces")
	entries, err := os.ReadDir(tracesDir)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Println("No traces directory found. Run agents to generate trace events first.")
			return nil
		}
		return fmt.Errorf("read traces dir: %w", err)
	}

	// Load all trace events.
	var allEvents []artifact.TraceEvent
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".jsonl") {
			continue
		}
		events, err := artifact.LoadTraces(filepath.Join(tracesDir, e.Name()))
		if err != nil {
			fmt.Printf("  Warning: skipping %s: %v\n", e.Name(), err)
			continue
		}
		allEvents = append(allEvents, events...)
	}

	if len(allEvents) == 0 {
		fmt.Println("No trace events found.")
		return nil
	}
	fmt.Printf("Loaded %d trace events from %d files.\n", len(allEvents), len(entries))

	// Build detection options.
	opts := drift.DetectionOptions{}
	if since != "" {
		t, err := parseDate(since)
		if err != nil {
			return fmt.Errorf("invalid --since date: %w", err)
		}
		opts.Since = &t
	}
	if skillID != "" {
		opts.SkillID = skillID
	}

	// Run detection.
	detector := drift.NewDetector()
	proposals := detector.DetectFromTraces(allEvents, opts)

	if len(proposals) == 0 {
		fmt.Println("No drift detected. Agent behavior is aligned with taste profile.")
		return nil
	}

	// Save proposals and display results.
	proposalsDir := filepath.Join(tastekitDir, "drift-proposals")
	store, err := drift.NewProposalStore(proposalsDir)
	if err != nil {
		return fmt.Errorf("create proposal store: %w", err)
	}

	fmt.Printf("\nDetected %d drift signal(s):\n\n", len(proposals))
	for _, p := range proposals {
		fmt.Printf("  [%s] %s\n", riskBadge(p.RiskRating), p.ProposalID)
		fmt.Printf("    Signal: %s (frequency: %d)\n", p.SignalType, p.Frequency)
		fmt.Printf("    %s\n", p.Rationale)
		if err := store.Save(p); err != nil {
			fmt.Printf("    Warning: failed to save proposal: %v\n", err)
		}
		fmt.Println()
	}

	fmt.Printf("Proposals saved to %s/\n", proposalsDir)
	fmt.Println("Run 'autoclaw drift review' to see pending proposals.")
	return nil
}

// DriftReviewCmd lists pending drift proposals.
func DriftReviewCmd(tastekitDir string) error {
	proposalsDir := filepath.Join(tastekitDir, "drift-proposals")
	store, err := drift.NewProposalStore(proposalsDir)
	if err != nil {
		return fmt.Errorf("open proposal store: %w", err)
	}

	pending, err := store.ListPending()
	if err != nil {
		return fmt.Errorf("list pending: %w", err)
	}

	if len(pending) == 0 {
		fmt.Println("No pending drift proposals.")
		return nil
	}

	fmt.Printf("%d pending drift proposal(s):\n\n", len(pending))
	for _, p := range pending {
		fmt.Printf("  [%s] %s\n", riskBadge(p.RiskRating), p.ProposalID)
		fmt.Printf("    Signal: %s (frequency: %d)\n", p.SignalType, p.Frequency)
		fmt.Printf("    %s\n", p.Rationale)
		if p.ProposedChanges != nil {
			data, _ := json.MarshalIndent(p.ProposedChanges, "    ", "  ")
			fmt.Printf("    Proposed changes: %s\n", string(data))
		}
		fmt.Println()
	}

	fmt.Println("Run 'autoclaw drift accept <id>' or 'autoclaw drift reject <id>' to act on proposals.")
	return nil
}

// DriftAcceptCmd accepts a drift proposal.
func DriftAcceptCmd(tastekitDir, proposalID string) error {
	proposalsDir := filepath.Join(tastekitDir, "drift-proposals")
	store, err := drift.NewProposalStore(proposalsDir)
	if err != nil {
		return fmt.Errorf("open proposal store: %w", err)
	}

	if err := store.Accept(proposalID); err != nil {
		return fmt.Errorf("accept proposal: %w", err)
	}

	fmt.Printf("Accepted proposal: %s\n", proposalID)
	fmt.Println("Note: Re-compile your TasteKit artifacts to apply the changes.")
	return nil
}

// DriftRejectCmd rejects a drift proposal.
func DriftRejectCmd(tastekitDir, proposalID string) error {
	proposalsDir := filepath.Join(tastekitDir, "drift-proposals")
	store, err := drift.NewProposalStore(proposalsDir)
	if err != nil {
		return fmt.Errorf("open proposal store: %w", err)
	}

	if err := store.Reject(proposalID); err != nil {
		return fmt.Errorf("reject proposal: %w", err)
	}

	fmt.Printf("Rejected proposal: %s\n", proposalID)
	return nil
}

func riskBadge(risk string) string {
	switch risk {
	case "high":
		return "HIGH"
	case "medium":
		return "MED "
	default:
		return "LOW "
	}
}
