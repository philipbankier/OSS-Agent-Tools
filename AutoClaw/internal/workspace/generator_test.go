package workspace

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

func testdataDir(t *testing.T) string {
	t.Helper()
	dir, err := filepath.Abs(filepath.Join("..", "..", "testdata"))
	if err != nil {
		t.Fatal(err)
	}
	return dir
}

func loadTestWorkspace(t *testing.T) *artifact.Workspace {
	t.Helper()
	dir := filepath.Join(testdataDir(t), "valid")
	ws, err := artifact.LoadWorkspace(dir)
	if err != nil {
		t.Fatalf("load workspace: %v", err)
	}
	return ws
}

func TestGenerateSoulMD(t *testing.T) {
	ws := loadTestWorkspace(t)
	gen := NewGenerator(ws)
	soul := gen.GenerateSoulMD()

	if !strings.Contains(soul, "# Soul") {
		t.Error("missing Soul header")
	}
	if !strings.Contains(soul, "p-clarity") {
		t.Error("missing p-clarity principle")
	}
	if !strings.Contains(soul, "Always prioritize clarity over cleverness") {
		t.Error("missing principle statement")
	}
	if !strings.Contains(soul, "direct, warm, professional") {
		t.Error("missing voice keywords")
	}
	if !strings.Contains(soul, "synergy") {
		t.Error("missing forbidden phrase")
	}
	if !strings.Contains(soul, "Never Do") {
		t.Error("missing taboos section")
	}
	if !strings.Contains(soul, "Must Escalate") {
		t.Error("missing escalation section")
	}
}

func TestGenerateIdentityMD(t *testing.T) {
	ws := loadTestWorkspace(t)
	gen := NewGenerator(ws)
	identity := gen.GenerateIdentityMD()

	if !strings.Contains(identity, "# Identity") {
		t.Error("missing Identity header")
	}
	if !strings.Contains(identity, "personal-brand") {
		t.Error("missing user scope")
	}
	if !strings.Contains(identity, "0.8") {
		t.Error("missing accuracy_vs_speed tradeoff")
	}
}

func TestGenerateAgentsMD(t *testing.T) {
	ws := loadTestWorkspace(t)
	gen := NewGenerator(ws)
	agents := gen.GenerateAgentsMD()

	if !strings.Contains(agents, "# Agent Instructions") {
		t.Error("missing Agent Instructions header")
	}
	if !strings.Contains(agents, "Permissions") {
		t.Error("missing Permissions section")
	}
	if !strings.Contains(agents, "content-read") {
		t.Error("missing permission scope")
	}
	if !strings.Contains(agents, "Approval Rules") {
		t.Error("missing Approval Rules section")
	}
	if !strings.Contains(agents, "require_approval") {
		t.Error("missing approval action")
	}
	if !strings.Contains(agents, "Available Skills") {
		t.Error("missing skills section")
	}
	if !strings.Contains(agents, "Content Writer") {
		t.Error("missing skill name")
	}
}

func TestGenerateUserMD(t *testing.T) {
	ws := loadTestWorkspace(t)
	gen := NewGenerator(ws)
	user := gen.GenerateUserMD()

	if !strings.Contains(user, "# User") {
		t.Error("missing User header")
	}
	if !strings.Contains(user, "personal-brand") {
		t.Error("missing user scope")
	}
	if !strings.Contains(user, "Memory Policy") {
		t.Error("missing Memory Policy section")
	}
	if !strings.Contains(user, "consolidate") {
		t.Error("missing update mode")
	}
}

func TestGenerateToolsMD(t *testing.T) {
	ws := loadTestWorkspace(t)
	gen := NewGenerator(ws)
	tools := gen.GenerateToolsMD()

	if !strings.Contains(tools, "# Tools") {
		t.Error("missing Tools header")
	}
	if !strings.Contains(tools, "filesystem") {
		t.Error("missing filesystem server")
	}
	if !strings.Contains(tools, "web-search") {
		t.Error("missing web-search server")
	}
}

func TestGenerateToolsMD_NoBindings(t *testing.T) {
	ws := loadTestWorkspace(t)
	ws.Bindings = nil
	gen := NewGenerator(ws)
	tools := gen.GenerateToolsMD()

	if !strings.Contains(tools, "No MCP tools configured") {
		t.Error("should show 'no tools' message when bindings nil")
	}
}

func TestGenerateAll(t *testing.T) {
	ws := loadTestWorkspace(t)
	gen := NewGenerator(ws)
	outDir := t.TempDir()

	if err := gen.GenerateAll(outDir); err != nil {
		t.Fatalf("GenerateAll: %v", err)
	}

	for _, name := range []string{"SOUL.md", "IDENTITY.md", "AGENTS.md", "USER.md"} {
		path := filepath.Join(outDir, name)
		data, err := os.ReadFile(path)
		if err != nil {
			t.Errorf("missing %s: %v", name, err)
			continue
		}
		if len(data) == 0 {
			t.Errorf("%s is empty", name)
		}
	}
}

func TestMigrateFromPicoClaw(t *testing.T) {
	// Use the PicoClaw workspace templates as source.
	wsDir := filepath.Join(testdataDir(t), "..", "workspace")
	c, err := MigrateFromPicoClaw(wsDir)
	if err != nil {
		t.Fatalf("MigrateFromPicoClaw: %v", err)
	}
	if c.SchemaVersion != "constitution.v1" {
		t.Errorf("schema_version = %q, want %q", c.SchemaVersion, "constitution.v1")
	}
	if c.UserScope != "migrated" {
		t.Errorf("user_scope = %q, want %q", c.UserScope, "migrated")
	}
	// SOUL.md has bullet points under Personality and Values.
	if len(c.Principles) == 0 {
		t.Error("expected principles from SOUL.md bullet points")
	}
	// Check that personality keywords were extracted.
	if len(c.Tone.VoiceKeywords) == 0 {
		t.Error("expected voice keywords from SOUL.md personality")
	}
}

func TestMigrateFromPicoClaw_EmptyDir(t *testing.T) {
	dir := t.TempDir()
	c, err := MigrateFromPicoClaw(dir)
	if err != nil {
		t.Fatalf("MigrateFromPicoClaw: %v", err)
	}
	// Should have a default principle.
	if len(c.Principles) != 1 {
		t.Errorf("expected 1 default principle, got %d", len(c.Principles))
	}
	if c.Principles[0].ID != "migrated-default" {
		t.Errorf("default principle id = %q, want %q", c.Principles[0].ID, "migrated-default")
	}
}
