package mcpclient

// WrapBuiltinTool converts a PicoClaw Tool's Name/Description/Parameters
// into an MCP ToolInfo. This lets MCP-aware code discover built-in tools
// without requiring a running MCP server.
//
// The Tool interface is duplicated here to avoid an import cycle with pkg/tools.
// Only Name(), Description(), and Parameters() are needed.
type WrappableTool interface {
	Name() string
	Description() string
	Parameters() map[string]interface{}
}

// WrapBuiltinTool converts a single built-in tool to MCP ToolInfo.
func WrapBuiltinTool(tool WrappableTool) ToolInfo {
	return ToolInfo{
		Name:        tool.Name(),
		Description: tool.Description(),
		InputSchema: tool.Parameters(),
	}
}

// WrapBuiltinTools converts a slice of built-in tools to MCP ToolInfo.
func WrapBuiltinTools(tools []WrappableTool) []ToolInfo {
	infos := make([]ToolInfo, len(tools))
	for i, t := range tools {
		infos[i] = WrapBuiltinTool(t)
	}
	return infos
}
