package artifact

// TrustV1 defines trust pins and update policies for MCP servers and skills.
// Loaded from .tastekit/artifacts/trust.v1.yaml (YAML).
type TrustV1 struct {
	SchemaVersion string             `json:"schema_version" yaml:"schema_version"`
	MCPServers    []TrustMCPServer   `json:"mcp_servers" yaml:"mcp_servers"`
	SkillSources  []TrustSkillSource `json:"skill_sources" yaml:"skill_sources"`
	UpdatePolicy  TrustUpdatePolicy  `json:"update_policy" yaml:"update_policy"`
}

// TrustMCPServer pins a specific MCP server by fingerprint.
type TrustMCPServer struct {
	URL         string `json:"url" yaml:"url"`
	Fingerprint string `json:"fingerprint" yaml:"fingerprint"`
	PinMode     string `json:"pin_mode" yaml:"pin_mode"` // "strict"|"warn"
}

// TrustSkillSource pins a skill from a local or git source.
type TrustSkillSource struct {
	Type    string  `json:"type" yaml:"type"` // "local"|"git"
	Path    *string `json:"path,omitempty" yaml:"path,omitempty"`
	URL     *string `json:"url,omitempty" yaml:"url,omitempty"`
	Commit  *string `json:"commit,omitempty" yaml:"commit,omitempty"`
	Hash    *string `json:"hash,omitempty" yaml:"hash,omitempty"`
	PinMode string  `json:"pin_mode" yaml:"pin_mode"` // "strict"|"warn"
}

// TrustUpdatePolicy controls auto-update and review requirements.
type TrustUpdatePolicy struct {
	AllowAutoUpdates bool `json:"allow_auto_updates" yaml:"allow_auto_updates"`
	RequireReview    bool `json:"require_review" yaml:"require_review"`
}
