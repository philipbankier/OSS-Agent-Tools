package cli

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/philipbankier/autoclaw/internal/drift"
	"github.com/philipbankier/autoclaw/internal/mcpclient"
)

// --- Drift CLI tests ---

func TestDriftDetectCmd_WithTraces(t *testing.T) {
	dir := t.TempDir()
	tracesDir := filepath.Join(dir, "traces")
	if err := os.MkdirAll(tracesDir, 0o755); err != nil {
		t.Fatal(err)
	}

	// Write trace events with 4 rejections for the same reason (above threshold of 3).
	lines := []string{
		`{"schema_version":"trace_event.v1","run_id":"r1","timestamp":"2026-02-18T10:00:00Z","actor":"system","event_type":"approval_response","data":{"approved":false,"reason":"too verbose"}}`,
		`{"schema_version":"trace_event.v1","run_id":"r1","timestamp":"2026-02-18T10:00:01Z","actor":"system","event_type":"approval_response","data":{"approved":false,"reason":"too verbose"}}`,
		`{"schema_version":"trace_event.v1","run_id":"r1","timestamp":"2026-02-18T10:00:02Z","actor":"system","event_type":"approval_response","data":{"approved":false,"reason":"too verbose"}}`,
		`{"schema_version":"trace_event.v1","run_id":"r1","timestamp":"2026-02-18T10:00:03Z","actor":"system","event_type":"approval_response","data":{"approved":false,"reason":"too verbose"}}`,
	}
	content := ""
	for _, l := range lines {
		content += l + "\n"
	}
	if err := os.WriteFile(filepath.Join(tracesDir, "test.jsonl"), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := DriftDetectCmd(dir, "", ""); err != nil {
		t.Fatalf("DriftDetectCmd error: %v", err)
	}

	// Verify proposals were saved.
	proposalsDir := filepath.Join(dir, "drift-proposals")
	entries, err := os.ReadDir(proposalsDir)
	if err != nil {
		t.Fatalf("read proposals dir: %v", err)
	}
	if len(entries) == 0 {
		t.Error("expected at least one proposal file")
	}
}

func TestDriftDetectCmd_NoTraces(t *testing.T) {
	dir := t.TempDir()
	// No traces directory at all — should succeed with a message.
	if err := DriftDetectCmd(dir, "", ""); err != nil {
		t.Fatalf("DriftDetectCmd error: %v", err)
	}
}

func TestDriftDetectCmd_EmptyTraces(t *testing.T) {
	dir := t.TempDir()
	tracesDir := filepath.Join(dir, "traces")
	if err := os.MkdirAll(tracesDir, 0o755); err != nil {
		t.Fatal(err)
	}
	// Empty traces directory.
	if err := DriftDetectCmd(dir, "", ""); err != nil {
		t.Fatalf("DriftDetectCmd error: %v", err)
	}
}

func TestDriftReviewCmd_NoPendingProposals(t *testing.T) {
	dir := t.TempDir()
	proposalsDir := filepath.Join(dir, "drift-proposals")
	if err := os.MkdirAll(proposalsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := DriftReviewCmd(dir); err != nil {
		t.Fatalf("DriftReviewCmd error: %v", err)
	}
}

func TestDriftReviewCmd_WithPendingProposals(t *testing.T) {
	dir := t.TempDir()
	proposalsDir := filepath.Join(dir, "drift-proposals")
	store, err := drift.NewProposalStore(proposalsDir)
	if err != nil {
		t.Fatal(err)
	}

	// Seed a proposal.
	p := drift.DriftProposal{
		ProposalID: "test-proposal-1",
		CreatedAt:  "2026-02-18T10:00:00Z",
		SignalType: "repeated_edit",
		Frequency:  5,
		RiskRating: "low",
		Rationale:  "Agent was rejected 5 times",
	}
	if err := store.Save(p); err != nil {
		t.Fatal(err)
	}

	if err := DriftReviewCmd(dir); err != nil {
		t.Fatalf("DriftReviewCmd error: %v", err)
	}
}

func TestDriftAcceptCmd(t *testing.T) {
	dir := t.TempDir()
	proposalsDir := filepath.Join(dir, "drift-proposals")
	store, err := drift.NewProposalStore(proposalsDir)
	if err != nil {
		t.Fatal(err)
	}

	p := drift.DriftProposal{
		ProposalID: "accept-test-1",
		CreatedAt:  "2026-02-18T10:00:00Z",
		SignalType: "repeated_edit",
		Frequency:  4,
		RiskRating: "low",
		Rationale:  "Test accept",
	}
	if err := store.Save(p); err != nil {
		t.Fatal(err)
	}

	if err := DriftAcceptCmd(dir, "accept-test-1"); err != nil {
		t.Fatalf("DriftAcceptCmd error: %v", err)
	}

	// Verify it's no longer pending.
	pending, err := store.ListPending()
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) != 0 {
		t.Errorf("expected 0 pending after accept, got %d", len(pending))
	}
}

func TestDriftRejectCmd(t *testing.T) {
	dir := t.TempDir()
	proposalsDir := filepath.Join(dir, "drift-proposals")
	store, err := drift.NewProposalStore(proposalsDir)
	if err != nil {
		t.Fatal(err)
	}

	p := drift.DriftProposal{
		ProposalID: "reject-test-1",
		CreatedAt:  "2026-02-18T10:00:00Z",
		SignalType: "principle_violation",
		Frequency:  3,
		RiskRating: "low",
		Rationale:  "Test reject",
	}
	if err := store.Save(p); err != nil {
		t.Fatal(err)
	}

	if err := DriftRejectCmd(dir, "reject-test-1"); err != nil {
		t.Fatalf("DriftRejectCmd error: %v", err)
	}

	pending, err := store.ListPending()
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) != 0 {
		t.Errorf("expected 0 pending after reject, got %d", len(pending))
	}
}

// --- MCP CLI tests ---

func TestMCPListCmd_Empty(t *testing.T) {
	dir := t.TempDir()
	if err := MCPListCmd(dir); err != nil {
		t.Fatalf("MCPListCmd error: %v", err)
	}
}

func TestMCPListCmd_WithServers(t *testing.T) {
	dir := t.TempDir()
	registryPath := filepath.Join(dir, "servers.json")

	// Pre-seed a registry.
	rf := mcpclient.RegistryFile{
		Servers: map[string]mcpclient.ServerConfig{
			"filesystem": {Command: "mcp-server-filesystem", Trust: "pinned", Version: "1.0"},
			"search":     {Command: "mcp-server-brave-search", Trust: "provisional"},
		},
	}
	data, _ := json.MarshalIndent(rf, "", "  ")
	if err := os.WriteFile(registryPath, data, 0o644); err != nil {
		t.Fatal(err)
	}

	if err := MCPListCmd(dir); err != nil {
		t.Fatalf("MCPListCmd error: %v", err)
	}
}

func TestMCPPinCmd(t *testing.T) {
	dir := t.TempDir()

	if err := MCPPinCmd(dir, "test-server", "sha256:abc123", "strict"); err != nil {
		t.Fatalf("MCPPinCmd error: %v", err)
	}

	// Verify the pin was created.
	trustPath := filepath.Join(dir, "trust.json")
	trust, err := mcpclient.NewTrustManager(trustPath)
	if err != nil {
		t.Fatal(err)
	}
	pin, ok := trust.Get("test-server")
	if !ok {
		t.Fatal("expected pin for test-server")
	}
	if pin.Fingerprint != "sha256:abc123" {
		t.Errorf("fingerprint = %q, want %q", pin.Fingerprint, "sha256:abc123")
	}
	if pin.PinMode != "strict" {
		t.Errorf("pin mode = %q, want %q", pin.PinMode, "strict")
	}
}

func TestMCPPinCmd_InvalidMode(t *testing.T) {
	dir := t.TempDir()
	err := MCPPinCmd(dir, "test-server", "sha256:abc", "invalid")
	if err == nil {
		t.Fatal("expected error for invalid pin mode")
	}
}

// --- Import-taste CLI test ---

func TestImportTasteCmd(t *testing.T) {
	// Use the testdata from the artifact package.
	tastekitDir := filepath.Join("..", "..", "testdata", "valid")
	workspaceDir := t.TempDir()

	if err := ImportTasteCmd(tastekitDir, workspaceDir); err != nil {
		t.Fatalf("ImportTasteCmd error: %v", err)
	}

	// Verify generated files.
	expectedFiles := []string{"SOUL.md", "IDENTITY.md", "AGENTS.md", "USER.md", "TOOLS.md"}
	for _, name := range expectedFiles {
		path := filepath.Join(workspaceDir, name)
		info, err := os.Stat(path)
		if err != nil {
			t.Errorf("expected %s to exist: %v", name, err)
			continue
		}
		if info.Size() == 0 {
			t.Errorf("expected %s to have content", name)
		}
	}
}

// --- Helpers test ---

func TestParseDate(t *testing.T) {
	d, err := parseDate("2026-01-15")
	if err != nil {
		t.Fatalf("parseDate error: %v", err)
	}
	if d.Year() != 2026 || d.Month() != 1 || d.Day() != 15 {
		t.Errorf("parseDate = %v, want 2026-01-15", d)
	}
}

func TestParseDate_Invalid(t *testing.T) {
	_, err := parseDate("not-a-date")
	if err == nil {
		t.Fatal("expected error for invalid date")
	}
}

// --- Drift cron test ---

func TestSetupDriftCronJob(t *testing.T) {
	dir := t.TempDir()
	cronStorePath := filepath.Join(dir, "cron", "jobs.json")

	if err := SetupDriftCronJob(cronStorePath, "/tmp/tastekit", "0 3 * * 0"); err != nil {
		t.Fatalf("SetupDriftCronJob error: %v", err)
	}

	// Verify the job was persisted.
	data, err := os.ReadFile(cronStorePath)
	if err != nil {
		t.Fatal(err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty cron store")
	}
}

func TestSetupDriftCronJob_EmptySchedule(t *testing.T) {
	dir := t.TempDir()
	cronStorePath := filepath.Join(dir, "cron", "jobs.json")

	err := SetupDriftCronJob(cronStorePath, "/tmp/tastekit", "")
	if err == nil {
		t.Fatal("expected error for empty schedule")
	}
}
