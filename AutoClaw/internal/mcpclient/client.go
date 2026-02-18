// Package mcpclient provides MCP (Model Context Protocol) client abstractions.
// The actual MCP SDK dependency is behind an interface for testability.
// MCPBridgeTool (in pkg/tools/mcp.go) adapts MCP tools into PicoClaw's Tool interface.
package mcpclient

import "context"

// ToolInfo describes a single tool offered by an MCP server.
type ToolInfo struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"inputSchema"`
}

// CallResult holds the result of calling an MCP tool.
type CallResult struct {
	Content string `json:"content"`
	IsError bool   `json:"isError"`
}

// Client is the interface for interacting with an MCP server.
// Production code uses StdioClient (wraps the official MCP Go SDK).
// Tests use MockClient.
type Client interface {
	// Connect establishes a connection to the MCP server.
	Connect(ctx context.Context) error

	// Close terminates the connection.
	Close() error

	// ListTools returns all tools offered by the server.
	ListTools(ctx context.Context) ([]ToolInfo, error)

	// CallTool invokes a named tool with the given arguments.
	CallTool(ctx context.Context, name string, args map[string]interface{}) (*CallResult, error)

	// ServerName returns the configured name for this server.
	ServerName() string

	// Fingerprint returns a hash identifying the server binary+version.
	Fingerprint() string
}
