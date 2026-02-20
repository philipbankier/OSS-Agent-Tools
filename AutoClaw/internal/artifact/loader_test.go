package artifact

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"gopkg.in/yaml.v3"
)

// testdataDir returns the absolute path to the testdata directory.
func testdataDir(t *testing.T) string {
	t.Helper()
	// From internal/artifact/ we need to go up two levels to AutoClaw root.
	dir, err := filepath.Abs(filepath.Join("..", "..", "testdata"))
	if err != nil {
		t.Fatal(err)
	}
	return dir
}

// --- Constitution Tests ---

func TestLoadConstitution_Valid(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "artifacts", "constitution.v1.json")
	c, err := LoadConstitution(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c.SchemaVersion != "constitution.v1" {
		t.Errorf("schema_version = %q, want %q", c.SchemaVersion, "constitution.v1")
	}
	if c.UserScope != "personal-brand" {
		t.Errorf("user_scope = %q, want %q", c.UserScope, "personal-brand")
	}
	if len(c.Principles) != 2 {
		t.Errorf("len(principles) = %d, want 2", len(c.Principles))
	}
	if c.Principles[0].ID != "p-clarity" {
		t.Errorf("principles[0].id = %q, want %q", c.Principles[0].ID, "p-clarity")
	}
	if c.Tradeoffs.AccuracyVsSpeed != 0.8 {
		t.Errorf("accuracy_vs_speed = %f, want 0.8", c.Tradeoffs.AccuracyVsSpeed)
	}
	if len(c.Tone.ForbiddenPhrases) != 3 {
		t.Errorf("len(forbidden_phrases) = %d, want 3", len(c.Tone.ForbiddenPhrases))
	}
	if c.TraceMap == nil {
		t.Error("trace_map should not be nil")
	}
}

func TestLoadConstitution_NoPrinciples(t *testing.T) {
	path := filepath.Join(testdataDir(t), "invalid", "constitution-no-principles.json")
	_, err := LoadConstitution(path)
	if err == nil {
		t.Fatal("expected error for empty principles, got nil")
	}
}

func TestLoadConstitution_BadTradeoff(t *testing.T) {
	path := filepath.Join(testdataDir(t), "invalid", "constitution-bad-tradeoff.json")
	_, err := LoadConstitution(path)
	if err == nil {
		t.Fatal("expected error for out-of-range tradeoff, got nil")
	}
}

func TestLoadConstitution_NotFound(t *testing.T) {
	_, err := LoadConstitution("/nonexistent/path/constitution.v1.json")
	if err == nil {
		t.Fatal("expected error for missing file, got nil")
	}
}

func TestConstitution_JSONRoundTrip(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "artifacts", "constitution.v1.json")
	c, err := LoadConstitution(path)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var c2 ConstitutionV1
	if err := json.Unmarshal(data, &c2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if c2.UserScope != c.UserScope {
		t.Errorf("round-trip user_scope mismatch: %q != %q", c2.UserScope, c.UserScope)
	}
	if len(c2.Principles) != len(c.Principles) {
		t.Errorf("round-trip principles count mismatch: %d != %d", len(c2.Principles), len(c.Principles))
	}
}

// --- Guardrails Tests ---

func TestLoadGuardrails_Valid(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "artifacts", "guardrails.v1.yaml")
	g, err := LoadGuardrails(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if g.SchemaVersion != "guardrails.v1" {
		t.Errorf("schema_version = %q, want %q", g.SchemaVersion, "guardrails.v1")
	}
	if len(g.Permissions) != 2 {
		t.Errorf("len(permissions) = %d, want 2", len(g.Permissions))
	}
	if len(g.Approvals) != 2 {
		t.Errorf("len(approvals) = %d, want 2", len(g.Approvals))
	}
	if len(g.RateLimits) != 2 {
		t.Errorf("len(rate_limits) = %d, want 2", len(g.RateLimits))
	}
	if g.Rollback == nil {
		t.Error("rollback should not be nil")
	}
	if g.Rollback.PlaybookRef != "rollback-content" {
		t.Errorf("rollback.playbook_ref = %q, want %q", g.Rollback.PlaybookRef, "rollback-content")
	}
}

func TestLoadGuardrails_BadOp(t *testing.T) {
	path := filepath.Join(testdataDir(t), "invalid", "guardrails-bad-op.yaml")
	_, err := LoadGuardrails(path)
	if err == nil {
		t.Fatal("expected error for invalid op, got nil")
	}
}

// --- Memory Tests ---

func TestLoadMemory_Valid(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "artifacts", "memory.v1.yaml")
	m, err := LoadMemory(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if m.SchemaVersion != "memory.v1" {
		t.Errorf("schema_version = %q, want %q", m.SchemaVersion, "memory.v1")
	}
	if m.WritePolicy.UpdateMode != "consolidate" {
		t.Errorf("update_mode = %q, want %q", m.WritePolicy.UpdateMode, "consolidate")
	}
	if len(m.WritePolicy.SalienceRules) != 2 {
		t.Errorf("len(salience_rules) = %d, want 2", len(m.WritePolicy.SalienceRules))
	}
	if m.WritePolicy.SalienceRules[0].Score != 0.9 {
		t.Errorf("salience_rules[0].score = %f, want 0.9", m.WritePolicy.SalienceRules[0].Score)
	}
	if m.RetentionPolicy.TTLDays == nil || *m.RetentionPolicy.TTLDays != 90 {
		t.Errorf("ttl_days should be 90")
	}
}

func TestLoadMemory_BadPrune(t *testing.T) {
	path := filepath.Join(testdataDir(t), "invalid", "memory-bad-prune.yaml")
	_, err := LoadMemory(path)
	if err == nil {
		t.Fatal("expected error for invalid prune_strategy, got nil")
	}
}

// --- Bindings Tests ---

func TestLoadBindings_Valid(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "artifacts", "bindings.v1.yaml")
	b, err := LoadBindings(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if b.SchemaVersion != "bindings.v1" {
		t.Errorf("schema_version = %q, want %q", b.SchemaVersion, "bindings.v1")
	}
	if len(b.Servers) != 2 {
		t.Errorf("len(servers) = %d, want 2", len(b.Servers))
	}
	if b.Servers[0].Name != "filesystem" {
		t.Errorf("servers[0].name = %q, want %q", b.Servers[0].Name, "filesystem")
	}
	if len(b.Servers[0].Tools) != 2 {
		t.Errorf("len(servers[0].tools) = %d, want 2", len(b.Servers[0].Tools))
	}
}

func TestBindings_YAMLRoundTrip(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "artifacts", "bindings.v1.yaml")
	b, err := LoadBindings(path)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	data, err := yaml.Marshal(b)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var b2 BindingsV1
	if err := yaml.Unmarshal(data, &b2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(b2.Servers) != len(b.Servers) {
		t.Errorf("round-trip servers count mismatch: %d != %d", len(b2.Servers), len(b.Servers))
	}
}

// --- Trust Tests ---

func TestLoadTrust_Valid(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "artifacts", "trust.v1.yaml")
	tr, err := LoadTrust(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tr.SchemaVersion != "trust.v1" {
		t.Errorf("schema_version = %q, want %q", tr.SchemaVersion, "trust.v1")
	}
	if len(tr.MCPServers) != 2 {
		t.Errorf("len(mcp_servers) = %d, want 2", len(tr.MCPServers))
	}
	if tr.MCPServers[0].PinMode != "strict" {
		t.Errorf("mcp_servers[0].pin_mode = %q, want %q", tr.MCPServers[0].PinMode, "strict")
	}
	if len(tr.SkillSources) != 2 {
		t.Errorf("len(skill_sources) = %d, want 2", len(tr.SkillSources))
	}
	if tr.UpdatePolicy.AllowAutoUpdates != false {
		t.Error("allow_auto_updates should be false")
	}
	if tr.UpdatePolicy.RequireReview != true {
		t.Error("require_review should be true")
	}
}

func TestLoadTrust_BadPinMode(t *testing.T) {
	path := filepath.Join(testdataDir(t), "invalid", "trust-bad-pin-mode.yaml")
	_, err := LoadTrust(path)
	if err == nil {
		t.Fatal("expected error for invalid pin_mode, got nil")
	}
}

// --- Skills Manifest Tests ---

func TestLoadSkillsManifest_Valid(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "artifacts", "skills", "manifest.v1.yaml")
	s, err := LoadSkillsManifest(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.SchemaVersion != "skills_manifest.v1" {
		t.Errorf("schema_version = %q, want %q", s.SchemaVersion, "skills_manifest.v1")
	}
	if len(s.Skills) != 2 {
		t.Errorf("len(skills) = %d, want 2", len(s.Skills))
	}
	if s.Skills[0].RiskLevel != "low" {
		t.Errorf("skills[0].risk_level = %q, want %q", s.Skills[0].RiskLevel, "low")
	}
}

// --- Playbook Tests ---

func TestLoadPlaybook_Valid(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "artifacts", "playbooks", "content-pipeline.v1.yaml")
	p, err := LoadPlaybook(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.ID != "content-pipeline" {
		t.Errorf("id = %q, want %q", p.ID, "content-pipeline")
	}
	if len(p.Steps) != 4 {
		t.Errorf("len(steps) = %d, want 4", len(p.Steps))
	}
	if p.Steps[0].Type != "tool" {
		t.Errorf("steps[0].type = %q, want %q", p.Steps[0].Type, "tool")
	}
	if len(p.Checks) != 2 {
		t.Errorf("len(checks) = %d, want 2", len(p.Checks))
	}
	if len(p.Escalations) != 1 {
		t.Errorf("len(escalations) = %d, want 1", len(p.Escalations))
	}
}

// --- EvalPack Tests ---

func TestLoadEvalPack_Valid(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "artifacts", "evals", "tone-eval.yaml")
	ep, err := LoadEvalPack(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ep.ID != "tone-eval" {
		t.Errorf("id = %q, want %q", ep.ID, "tone-eval")
	}
	if len(ep.Scenarios) != 2 {
		t.Errorf("len(scenarios) = %d, want 2", len(ep.Scenarios))
	}
	if len(ep.Judging.Rules) != 2 {
		t.Errorf("len(judging.rules) = %d, want 2", len(ep.Judging.Rules))
	}
	if ep.Judging.Rules[0].Weight != 0.3 {
		t.Errorf("judging.rules[0].weight = %f, want 0.3", ep.Judging.Rules[0].Weight)
	}
}

// --- Trace Tests ---

func TestLoadTraces_Valid(t *testing.T) {
	path := filepath.Join(testdataDir(t), "valid", "traces", "run-001.jsonl")
	events, err := LoadTraces(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 6 {
		t.Errorf("len(events) = %d, want 6", len(events))
	}
	if events[0].Actor != "user" {
		t.Errorf("events[0].actor = %q, want %q", events[0].Actor, "user")
	}
	if events[0].EventType != "plan" {
		t.Errorf("events[0].event_type = %q, want %q", events[0].EventType, "plan")
	}
	if events[2].ToolRef == nil || *events[2].ToolRef != "web-search:search" {
		t.Error("events[2].tool_ref should be 'web-search:search'")
	}
	if events[5].Error == nil || *events[5].Error == "" {
		t.Error("events[5].error should be populated")
	}
}

// --- Full Workspace Tests ---

func TestLoadWorkspace_Valid(t *testing.T) {
	dir := filepath.Join(testdataDir(t), "valid")
	ws, err := LoadWorkspace(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ws.Constitution == nil {
		t.Fatal("constitution should not be nil")
	}
	if ws.Guardrails == nil {
		t.Fatal("guardrails should not be nil")
	}
	if ws.Memory == nil {
		t.Fatal("memory should not be nil")
	}
	if ws.Bindings == nil {
		t.Fatal("bindings should not be nil")
	}
	if ws.Trust == nil {
		t.Fatal("trust should not be nil")
	}
	if ws.Skills == nil {
		t.Fatal("skills should not be nil")
	}
	if len(ws.Playbooks) != 1 {
		t.Errorf("len(playbooks) = %d, want 1", len(ws.Playbooks))
	}
	if len(ws.EvalPacks) != 1 {
		t.Errorf("len(evalpacks) = %d, want 1", len(ws.EvalPacks))
	}
	if len(ws.Traces) != 6 {
		t.Errorf("len(traces) = %d, want 6", len(ws.Traces))
	}
}

func TestLoadWorkspace_MissingConstitution(t *testing.T) {
	// Create a temp dir with no constitution file.
	dir := t.TempDir()
	artDir := filepath.Join(dir, "artifacts")
	if err := os.MkdirAll(artDir, 0o755); err != nil {
		t.Fatal(err)
	}
	_, err := LoadWorkspace(dir)
	if err == nil {
		t.Fatal("expected error for missing constitution, got nil")
	}
}

func TestLoadWorkspace_OptionalFilesSkipped(t *testing.T) {
	// Create a temp workspace with only the required constitution.
	dir := t.TempDir()
	artDir := filepath.Join(dir, "artifacts")
	if err := os.MkdirAll(artDir, 0o755); err != nil {
		t.Fatal(err)
	}
	// Copy the valid constitution.
	src := filepath.Join(testdataDir(t), "valid", "artifacts", "constitution.v1.json")
	data, err := os.ReadFile(src)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(artDir, "constitution.v1.json"), data, 0o644); err != nil {
		t.Fatal(err)
	}
	ws, err := LoadWorkspace(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ws.Constitution == nil {
		t.Fatal("constitution should not be nil")
	}
	// All optional should be nil/empty.
	if ws.Guardrails != nil {
		t.Error("guardrails should be nil when file missing")
	}
	if ws.Memory != nil {
		t.Error("memory should be nil when file missing")
	}
	if ws.Bindings != nil {
		t.Error("bindings should be nil when file missing")
	}
	if ws.Trust != nil {
		t.Error("trust should be nil when file missing")
	}
	if ws.Skills != nil {
		t.Error("skills should be nil when file missing")
	}
	if len(ws.Playbooks) != 0 {
		t.Error("playbooks should be empty when dir missing")
	}
	if len(ws.EvalPacks) != 0 {
		t.Error("evalpacks should be empty when dir missing")
	}
	if len(ws.Traces) != 0 {
		t.Error("traces should be empty when dir missing")
	}
}

func TestLoadWorkspace_MalformedYAMLFails(t *testing.T) {
	// Create workspace where guardrails is malformed YAML.
	dir := t.TempDir()
	artDir := filepath.Join(dir, "artifacts")
	if err := os.MkdirAll(artDir, 0o755); err != nil {
		t.Fatal(err)
	}
	// Copy valid constitution.
	src := filepath.Join(testdataDir(t), "valid", "artifacts", "constitution.v1.json")
	data, err := os.ReadFile(src)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(artDir, "constitution.v1.json"), data, 0o644); err != nil {
		t.Fatal(err)
	}
	// Write malformed guardrails.
	malformed := filepath.Join(testdataDir(t), "invalid", "malformed.yaml")
	mdata, err := os.ReadFile(malformed)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(artDir, "guardrails.v1.yaml"), mdata, 0o644); err != nil {
		t.Fatal(err)
	}
	_, err = LoadWorkspace(dir)
	if err == nil {
		t.Fatal("expected error for malformed guardrails, got nil")
	}
}
