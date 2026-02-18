package artifact

// BindingsV1 maps MCP servers and their selected tools/resources/prompts.
// Loaded from .tastekit/artifacts/bindings.v1.yaml (YAML).
type BindingsV1 struct {
	SchemaVersion string           `json:"schema_version" yaml:"schema_version"`
	Servers       []BindingsServer `json:"servers" yaml:"servers"`
}

// BindingsServer configures a single MCP server connection.
type BindingsServer struct {
	Name              string              `json:"name" yaml:"name"`
	URL               string              `json:"url" yaml:"url"`
	PinnedFingerprint *string             `json:"pinned_fingerprint,omitempty" yaml:"pinned_fingerprint,omitempty"`
	Auth              map[string]string   `json:"auth,omitempty" yaml:"auth,omitempty"`
	Tools             []BindingsTool      `json:"tools" yaml:"tools"`
	Resources         []BindingsResource  `json:"resources,omitempty" yaml:"resources,omitempty"`
	Prompts           []BindingsPrompt    `json:"prompts,omitempty" yaml:"prompts,omitempty"`
	LastBindAt        string              `json:"last_bind_at" yaml:"last_bind_at"`
}

// BindingsTool selects an MCP tool for agent use.
type BindingsTool struct {
	ToolRef                  string  `json:"tool_ref" yaml:"tool_ref"` // "server:tool"
	RiskHints                []string `json:"risk_hints,omitempty" yaml:"risk_hints,omitempty"`
	DefaultPermissionScopeID *string `json:"default_permission_scope_id,omitempty" yaml:"default_permission_scope_id,omitempty"`
}

// BindingsResource selects an MCP resource.
type BindingsResource struct {
	ResourceRef string  `json:"resource_ref" yaml:"resource_ref"` // "server:resource"
	URIPattern  *string `json:"uri_pattern,omitempty" yaml:"uri_pattern,omitempty"`
}

// BindingsPrompt selects an MCP prompt template.
type BindingsPrompt struct {
	PromptRef   string  `json:"prompt_ref" yaml:"prompt_ref"` // "server:prompt"
	Description *string `json:"description,omitempty" yaml:"description,omitempty"`
}
