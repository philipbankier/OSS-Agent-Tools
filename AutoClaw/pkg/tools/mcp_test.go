package tools

import (
	"context"
	"testing"

	"github.com/philipbankier/autoclaw/internal/mcpclient"
)

func TestMCPBridgeTool_Name(t *testing.T) {
	mock := mcpclient.NewMockClient("fs", "sha256:abc")
	tool := NewMCPBridgeTool("fs", mcpclient.ToolInfo{
		Name:        "read_file",
		Description: "Read a file",
	}, mock)

	if got := tool.Name(); got != "fs:read_file" {
		t.Errorf("Name() = %q, want %q", got, "fs:read_file")
	}
}

func TestMCPBridgeTool_Description(t *testing.T) {
	mock := mcpclient.NewMockClient("fs", "sha256:abc")
	tool := NewMCPBridgeTool("fs", mcpclient.ToolInfo{
		Name:        "read_file",
		Description: "Read a file from the filesystem",
	}, mock)

	if got := tool.Description(); got != "Read a file from the filesystem" {
		t.Errorf("Description() = %q", got)
	}
}

func TestMCPBridgeTool_Parameters(t *testing.T) {
	mock := mcpclient.NewMockClient("fs", "sha256:abc")
	schema := map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"path": map[string]interface{}{"type": "string"},
		},
		"required": []string{"path"},
	}
	tool := NewMCPBridgeTool("fs", mcpclient.ToolInfo{
		Name:        "read_file",
		InputSchema: schema,
	}, mock)

	params := tool.Parameters()
	if params["type"] != "object" {
		t.Error("parameters should have type object")
	}
}

func TestMCPBridgeTool_Parameters_Nil(t *testing.T) {
	mock := mcpclient.NewMockClient("fs", "sha256:abc")
	tool := NewMCPBridgeTool("fs", mcpclient.ToolInfo{
		Name: "list",
	}, mock)

	params := tool.Parameters()
	if params["type"] != "object" {
		t.Error("nil schema should return default object schema")
	}
}

func TestMCPBridgeTool_Execute_Success(t *testing.T) {
	mock := mcpclient.NewMockClient("fs", "sha256:abc")
	mock.SetResponse("read_file", &mcpclient.CallResult{
		Content: "file contents here",
		IsError: false,
	})

	ctx := context.Background()
	mock.Connect(ctx)

	tool := NewMCPBridgeTool("fs", mcpclient.ToolInfo{Name: "read_file"}, mock)
	result := tool.Execute(ctx, map[string]interface{}{"path": "/test.txt"})

	if result.IsError {
		t.Errorf("expected success, got error: %s", result.ForLLM)
	}
	if result.ForLLM != "file contents here" {
		t.Errorf("ForLLM = %q, want %q", result.ForLLM, "file contents here")
	}
	if !result.Silent {
		t.Error("MCP results should be silent (for LLM only)")
	}
}

func TestMCPBridgeTool_Execute_MCPError(t *testing.T) {
	mock := mcpclient.NewMockClient("fs", "sha256:abc")
	mock.SetResponse("read_file", &mcpclient.CallResult{
		Content: "file not found",
		IsError: true,
	})

	ctx := context.Background()
	mock.Connect(ctx)

	tool := NewMCPBridgeTool("fs", mcpclient.ToolInfo{Name: "read_file"}, mock)
	result := tool.Execute(ctx, map[string]interface{}{"path": "/missing.txt"})

	if !result.IsError {
		t.Error("expected error result for MCP error response")
	}
}

func TestMCPBridgeTool_Execute_ConnectionError(t *testing.T) {
	mock := mcpclient.NewMockClient("fs", "sha256:abc")
	// Don't connect — calls should fail.
	tool := NewMCPBridgeTool("fs", mcpclient.ToolInfo{Name: "read_file"}, mock)

	result := tool.Execute(context.Background(), nil)
	if !result.IsError {
		t.Error("expected error when not connected")
	}
}

func TestMCPBridgeTool_CallRecorded(t *testing.T) {
	mock := mcpclient.NewMockClient("search", "sha256:def")
	mock.SetResponse("query", &mcpclient.CallResult{Content: "results"})

	ctx := context.Background()
	mock.Connect(ctx)

	tool := NewMCPBridgeTool("search", mcpclient.ToolInfo{Name: "query"}, mock)
	tool.Execute(ctx, map[string]interface{}{"q": "test query"})

	calls := mock.Calls()
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %d", len(calls))
	}
	if calls[0].ToolName != "query" {
		t.Errorf("call.tool = %q, want %q", calls[0].ToolName, "query")
	}
}

// Verify MCPBridgeTool satisfies the Tool interface.
var _ Tool = (*MCPBridgeTool)(nil)
