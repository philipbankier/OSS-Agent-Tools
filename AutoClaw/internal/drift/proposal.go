package drift

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// DriftProposal is an actionable change suggested by drift detection.
type DriftProposal struct {
	ProposalID      string `json:"proposal_id"`
	CreatedAt       string `json:"created_at"`
	SignalType      string `json:"signal_type"`
	Frequency       int    `json:"frequency"`
	Rationale       string `json:"rationale"`
	ProposedChanges any    `json:"proposed_changes"`
	RiskRating      string `json:"risk_rating"` // "low"|"medium"|"high"
	Evidence        any    `json:"evidence"`
	Status          string `json:"status"` // "pending"|"accepted"|"rejected"
}

// ProposalStore persists drift proposals as individual JSON files.
type ProposalStore struct {
	dir string
}

// NewProposalStore creates or opens a proposal store in the given directory.
func NewProposalStore(dir string) (*ProposalStore, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &ProposalStore{dir: dir}, nil
}

// Save writes a proposal to disk.
func (ps *ProposalStore) Save(p DriftProposal) error {
	if p.Status == "" {
		p.Status = "pending"
	}
	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return err
	}
	path := filepath.Join(ps.dir, p.ProposalID+".json")
	return os.WriteFile(path, data, 0o644)
}

// Load reads a proposal from disk.
func (ps *ProposalStore) Load(proposalID string) (*DriftProposal, error) {
	path := filepath.Join(ps.dir, proposalID+".json")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var p DriftProposal
	if err := json.Unmarshal(data, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

// ListPending returns all proposals with status "pending".
func (ps *ProposalStore) ListPending() ([]DriftProposal, error) {
	return ps.listByStatus("pending")
}

// Accept marks a proposal as accepted.
func (ps *ProposalStore) Accept(proposalID string) error {
	return ps.setStatus(proposalID, "accepted")
}

// Reject marks a proposal as rejected.
func (ps *ProposalStore) Reject(proposalID string) error {
	return ps.setStatus(proposalID, "rejected")
}

func (ps *ProposalStore) setStatus(proposalID, status string) error {
	p, err := ps.Load(proposalID)
	if err != nil {
		return fmt.Errorf("load proposal %s: %w", proposalID, err)
	}
	p.Status = status
	return ps.Save(*p)
}

func (ps *ProposalStore) listByStatus(status string) ([]DriftProposal, error) {
	entries, err := os.ReadDir(ps.dir)
	if err != nil {
		return nil, err
	}
	var proposals []DriftProposal
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(ps.dir, e.Name()))
		if err != nil {
			continue
		}
		var p DriftProposal
		if err := json.Unmarshal(data, &p); err != nil {
			continue
		}
		if p.Status == status {
			proposals = append(proposals, p)
		}
	}
	return proposals, nil
}
