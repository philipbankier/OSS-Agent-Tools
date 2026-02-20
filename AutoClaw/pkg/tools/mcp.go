package tools

import (
	"context"
	"fmt"

	"github.com/philipbankier/autoclaw/internal/mcpclient"
)

// MCPBridgeTool wraps a single MCP tool as a PicoClaw Tool.
// One MCPBridgeTool per MCP tool per MCP server. It registers in the
// standard ToolRegistry alongside built-in tools (read_file, exec, etc.).
// Zero changes to the agent loop required.
type MCPBridgeTool struct {
	serverName  string
	toolName    string
	description string
	client      mcpclient.Client
	schema      map[string]interface{} // MCP inputSchema → OpenAI function-calling format
}

// NewMCPBridgeTool creates a bridge tool from an MCP tool info.
func NewMCPBridgeTool(serverName string, info mcpclient.ToolInfo, client mcpclient.Client) *MCPBridgeTool {
	return &MCPBridgeTool{
		serverName:  serverName,
		toolName:    info.Name,
		description: info.Description,
		client:      client,
		schema:      info.InputSchema,
	}
}

// Name returns "server:tool" format (e.g. "filesystem:read_file").
func (t *MCPBridgeTool) Name() string {
	return fmt.Sprintf("%s:%s", t.serverName, t.toolName)
}

// Description returns the MCP tool's description.
func (t *MCPBridgeTool) Description() string {
	return t.description
}

// Parameters returns the tool's JSON Schema in OpenAI function-calling format.
func (t *MCPBridgeTool) Parameters() map[string]interface{} {
	if t.schema != nil {
		return t.schema
	}
	return map[string]interface{}{
		"type":       "object",
		"properties": map[string]interface{}{},
	}
}

// Execute calls the MCP server tool and wraps the response as a ToolResult.
func (t *MCPBridgeTool) Execute(ctx context.Context, args map[string]interface{}) *ToolResult {
	result, err := t.client.CallTool(ctx, t.toolName, args)
	if err != nil {
		return ErrorResult(fmt.Sprintf("MCP tool %s error: %v", t.Name(), err)).WithError(err)
	}
	if result.IsError {
		return ErrorResult(fmt.Sprintf("MCP tool %s returned error: %s", t.Name(), result.Content))
	}
	return SilentResult(result.Content)
}
