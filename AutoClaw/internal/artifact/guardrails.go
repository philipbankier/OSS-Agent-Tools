package artifact

// GuardrailsV1 defines behavioral constraints and approval rules.
// Loaded from .tastekit/artifacts/guardrails.v1.yaml (YAML).
type GuardrailsV1 struct {
	SchemaVersion string                 `json:"schema_version" yaml:"schema_version"`
	Permissions   []GuardrailsPermission `json:"permissions" yaml:"permissions"`
	Approvals     []GuardrailsApproval   `json:"approvals" yaml:"approvals"`
	RateLimits    []GuardrailsRateLimit  `json:"rate_limits" yaml:"rate_limits"`
	Rollback      *GuardrailsRollback    `json:"rollback,omitempty" yaml:"rollback,omitempty"`
}

// GuardrailsPermission grants an operation scope on a tool+resource pair.
type GuardrailsPermission struct {
	ScopeID   string   `json:"scope_id" yaml:"scope_id"`
	ToolRef   string   `json:"tool_ref" yaml:"tool_ref"`
	Resources []string `json:"resources" yaml:"resources"`
	Ops       []string `json:"ops" yaml:"ops"` // "read"|"write"|"delete"|"execute"|"post"|"publish"|"admin"
}

// GuardrailsApproval defines when human approval is required.
type GuardrailsApproval struct {
	RuleID  string `json:"rule_id" yaml:"rule_id"`
	When    string `json:"when" yaml:"when"`
	Action  string `json:"action" yaml:"action"`   // "require_approval"|"block"|"allow"
	Channel string `json:"channel" yaml:"channel"` // "cli"|"ui"|"webhook"
}

// GuardrailsRateLimit caps tool invocations within a time window.
type GuardrailsRateLimit struct {
	ToolRef string `json:"tool_ref" yaml:"tool_ref"`
	Limit   int    `json:"limit" yaml:"limit"`
	Window  string `json:"window" yaml:"window"` // e.g. "1h", "1d"
}

// GuardrailsRollback references a playbook for reverting changes.
type GuardrailsRollback struct {
	PlaybookRef string  `json:"playbook_ref" yaml:"playbook_ref"`
	Notes       *string `json:"notes,omitempty" yaml:"notes,omitempty"`
}
