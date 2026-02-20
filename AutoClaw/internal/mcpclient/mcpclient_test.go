package mcpclient

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

// --- MockClient Tests ---

func TestMockClient_ConnectAndListTools(t *testing.T) {
	m := NewMockClient("test-server", "sha256:abc")
	m.AddTool(ToolInfo{Name: "read_file", Description: "Read a file", InputSchema: map[string]interface{}{"type": "object"}})
	m.AddTool(ToolInfo{Name: "search", Description: "Web search"})

	ctx := context.Background()
	if err := m.Connect(ctx); err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer m.Close()

	tools, err := m.ListTools(ctx)
	if err != nil {
		t.Fatalf("list tools: %v", err)
	}
	if len(tools) != 2 {
		t.Errorf("len(tools) = %d, want 2", len(tools))
	}
	if tools[0].Name != "read_file" {
		t.Errorf("tools[0].name = %q, want %q", tools[0].Name, "read_file")
	}
}

func TestMockClient_CallTool(t *testing.T) {
	m := NewMockClient("test-server", "sha256:abc")
	m.SetResponse("search", &CallResult{Content: "result data", IsError: false})

	ctx := context.Background()
	if err := m.Connect(ctx); err != nil {
		t.Fatal(err)
	}
	defer m.Close()

	result, err := m.CallTool(ctx, "search", map[string]interface{}{"query": "test"})
	if err != nil {
		t.Fatalf("call tool: %v", err)
	}
	if result.Content != "result data" {
		t.Errorf("content = %q, want %q", result.Content, "result data")
	}
	if result.IsError {
		t.Error("should not be error")
	}

	calls := m.Calls()
	if len(calls) != 1 {
		t.Fatalf("len(calls) = %d, want 1", len(calls))
	}
	if calls[0].ToolName != "search" {
		t.Errorf("call.tool = %q, want %q", calls[0].ToolName, "search")
	}
}

func TestMockClient_NotConnected(t *testing.T) {
	m := NewMockClient("test", "sha256:abc")
	ctx := context.Background()

	_, err := m.ListTools(ctx)
	if err == nil {
		t.Error("expected error when not connected")
	}

	_, err = m.CallTool(ctx, "test", nil)
	if err == nil {
		t.Error("expected error when not connected")
	}
}

func TestMockClient_NoResponse(t *testing.T) {
	m := NewMockClient("test", "sha256:abc")
	ctx := context.Background()
	m.Connect(ctx)

	_, err := m.CallTool(ctx, "nonexistent", nil)
	if err == nil {
		t.Error("expected error for unconfigured tool")
	}
}

func TestMockClient_ServerInfo(t *testing.T) {
	m := NewMockClient("my-server", "sha256:xyz")
	if m.ServerName() != "my-server" {
		t.Errorf("server name = %q, want %q", m.ServerName(), "my-server")
	}
	if m.Fingerprint() != "sha256:xyz" {
		t.Errorf("fingerprint = %q, want %q", m.Fingerprint(), "sha256:xyz")
	}
}

// --- Registry Tests ---

func TestRegistry_NewEmpty(t *testing.T) {
	path := filepath.Join(t.TempDir(), "servers.json")
	r, err := NewRegistry(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.List()) != 0 {
		t.Error("new registry should be empty")
	}
}

func TestRegistry_SetAndGet(t *testing.T) {
	path := filepath.Join(t.TempDir(), "servers.json")
	r, err := NewRegistry(path)
	if err != nil {
		t.Fatal(err)
	}

	cfg := ServerConfig{Command: "mcp-server-fs", Trust: "pinned", Version: "1.0.0"}
	if err := r.Set("filesystem", cfg); err != nil {
		t.Fatal(err)
	}

	got, ok := r.Get("filesystem")
	if !ok {
		t.Fatal("server not found after Set")
	}
	if got.Command != "mcp-server-fs" {
		t.Errorf("command = %q, want %q", got.Command, "mcp-server-fs")
	}
}

func TestRegistry_Persistence(t *testing.T) {
	path := filepath.Join(t.TempDir(), "servers.json")
	r1, _ := NewRegistry(path)
	r1.Set("test", ServerConfig{Command: "test-cmd", Trust: "pinned"})

	// Re-load from disk.
	r2, err := NewRegistry(path)
	if err != nil {
		t.Fatal(err)
	}
	got, ok := r2.Get("test")
	if !ok {
		t.Fatal("server lost after reload")
	}
	if got.Command != "test-cmd" {
		t.Errorf("command = %q after reload", got.Command)
	}
}

func TestRegistry_Remove(t *testing.T) {
	path := filepath.Join(t.TempDir(), "servers.json")
	r, _ := NewRegistry(path)
	r.Set("a", ServerConfig{Command: "a"})
	r.Set("b", ServerConfig{Command: "b"})

	if err := r.Remove("a"); err != nil {
		t.Fatal(err)
	}
	if _, ok := r.Get("a"); ok {
		t.Error("server 'a' should be removed")
	}
	if _, ok := r.Get("b"); !ok {
		t.Error("server 'b' should still exist")
	}
}

// --- TrustManager Tests ---

func TestTrustManager_PinAndVerify(t *testing.T) {
	path := filepath.Join(t.TempDir(), "trust.json")
	tm, err := NewTrustManager(path)
	if err != nil {
		t.Fatal(err)
	}

	pin := TrustPin{Fingerprint: "sha256:abc", PinMode: "strict", PinnedAt: "2026-02-18T10:00:00Z"}
	if err := tm.Pin("filesystem", pin); err != nil {
		t.Fatal(err)
	}

	// Matching fingerprint.
	trusted, msg := tm.Verify("filesystem", "sha256:abc")
	if !trusted {
		t.Errorf("should be trusted, msg=%q", msg)
	}
	if msg != "" {
		t.Errorf("no warning expected, got %q", msg)
	}

	// Non-matching fingerprint (strict mode).
	trusted, msg = tm.Verify("filesystem", "sha256:wrong")
	if trusted {
		t.Error("should NOT be trusted with wrong fingerprint in strict mode")
	}
	if msg == "" {
		t.Error("expected warning message for mismatch")
	}
}

func TestTrustManager_WarnMode(t *testing.T) {
	path := filepath.Join(t.TempDir(), "trust.json")
	tm, _ := NewTrustManager(path)

	tm.Pin("search", TrustPin{Fingerprint: "sha256:def", PinMode: "warn", PinnedAt: "2026-02-18T10:00:00Z"})

	// Non-matching in warn mode: trusted but with warning.
	trusted, msg := tm.Verify("search", "sha256:different")
	if !trusted {
		t.Error("warn mode should still be trusted")
	}
	if msg == "" {
		t.Error("expected warning message in warn mode")
	}
}

func TestTrustManager_UnknownServer(t *testing.T) {
	path := filepath.Join(t.TempDir(), "trust.json")
	tm, _ := NewTrustManager(path)

	trusted, _ := tm.Verify("unknown", "sha256:anything")
	if trusted {
		t.Error("unknown server should not be trusted")
	}
}

func TestTrustManager_Persistence(t *testing.T) {
	path := filepath.Join(t.TempDir(), "trust.json")
	tm1, _ := NewTrustManager(path)
	tm1.Pin("fs", TrustPin{Fingerprint: "sha256:aaa", PinMode: "strict"})

	tm2, err := NewTrustManager(path)
	if err != nil {
		t.Fatal(err)
	}
	pin, ok := tm2.Get("fs")
	if !ok {
		t.Fatal("pin lost after reload")
	}
	if pin.Fingerprint != "sha256:aaa" {
		t.Errorf("fingerprint = %q after reload", pin.Fingerprint)
	}
}

// --- Auditor Tests ---

func TestAuditor_AllClean(t *testing.T) {
	dir := t.TempDir()
	regPath := filepath.Join(dir, "servers.json")
	trustPath := filepath.Join(dir, "trust.json")

	reg, _ := NewRegistry(regPath)
	reg.Set("fs", ServerConfig{Command: "stdio://mcp-server-filesystem", Trust: "pinned"})

	tm, _ := NewTrustManager(trustPath)
	tm.Pin("fs", TrustPin{Fingerprint: "sha256:abc", PinMode: "strict"})

	trustArtifact := &artifact.TrustV1{
		SchemaVersion: "trust.v1",
		MCPServers: []artifact.TrustMCPServer{
			{URL: "stdio://mcp-server-filesystem", Fingerprint: "sha256:abc", PinMode: "strict"},
		},
		UpdatePolicy: artifact.TrustUpdatePolicy{RequireReview: true},
	}

	auditor := NewAuditor(reg, tm)
	findings := auditor.Audit(trustArtifact)
	if len(findings) != 1 || findings[0].Severity != "info" {
		t.Errorf("expected clean audit, got %+v", findings)
	}
}

func TestAuditor_UnregisteredServer(t *testing.T) {
	dir := t.TempDir()
	reg, _ := NewRegistry(filepath.Join(dir, "servers.json"))
	tm, _ := NewTrustManager(filepath.Join(dir, "trust.json"))

	trustArtifact := &artifact.TrustV1{
		SchemaVersion: "trust.v1",
		MCPServers: []artifact.TrustMCPServer{
			{URL: "stdio://missing-server", Fingerprint: "sha256:aaa", PinMode: "strict"},
		},
		UpdatePolicy: artifact.TrustUpdatePolicy{RequireReview: true},
	}

	findings := NewAuditor(reg, tm).Audit(trustArtifact)
	hasWarning := false
	for _, f := range findings {
		if f.Severity == "warning" && f.ServerName == "stdio://missing-server" {
			hasWarning = true
		}
	}
	if !hasWarning {
		t.Error("expected warning for unregistered server")
	}
}

func TestAuditor_NoPinForRegistered(t *testing.T) {
	dir := t.TempDir()
	reg, _ := NewRegistry(filepath.Join(dir, "servers.json"))
	reg.Set("unpinned", ServerConfig{Command: "test"})
	tm, _ := NewTrustManager(filepath.Join(dir, "trust.json"))

	trustArtifact := &artifact.TrustV1{SchemaVersion: "trust.v1", UpdatePolicy: artifact.TrustUpdatePolicy{}}

	findings := NewAuditor(reg, tm).Audit(trustArtifact)
	hasWarning := false
	for _, f := range findings {
		if f.Severity == "warning" && f.ServerName == "unpinned" {
			hasWarning = true
		}
	}
	if !hasWarning {
		t.Error("expected warning for server without trust pin")
	}
}

func TestAuditor_EmptyFingerprintStrict(t *testing.T) {
	dir := t.TempDir()
	reg, _ := NewRegistry(filepath.Join(dir, "servers.json"))
	tm, _ := NewTrustManager(filepath.Join(dir, "trust.json"))
	tm.Pin("bad", TrustPin{Fingerprint: "", PinMode: "strict"})

	trustArtifact := &artifact.TrustV1{SchemaVersion: "trust.v1", UpdatePolicy: artifact.TrustUpdatePolicy{}}

	// Also need to register the server so we don't get "no pin" warning instead.
	reg.Set("bad", ServerConfig{Command: "test"})

	findings := NewAuditor(reg, tm).Audit(trustArtifact)
	hasError := false
	for _, f := range findings {
		if f.Severity == "error" && f.ServerName == "bad" {
			hasError = true
		}
	}
	if !hasError {
		t.Error("expected error for empty fingerprint in strict mode")
	}
}

// --- Helper to verify file was written ---

func TestRegistry_FileCreated(t *testing.T) {
	path := filepath.Join(t.TempDir(), "servers.json")
	r, _ := NewRegistry(path)
	r.Set("test", ServerConfig{Command: "cmd"})

	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Error("servers.json should be created after Set")
	}
}
