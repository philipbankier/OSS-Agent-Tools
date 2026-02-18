package artifact

// TraceEvent represents a single event in a JSONL trace log.
// Loaded from .tastekit/traces/*.jsonl (one JSON object per line).
type TraceEvent struct {
	SchemaVersion string `json:"schema_version" yaml:"schema_version"`
	RunID         string `json:"run_id" yaml:"run_id"`
	Timestamp     string `json:"timestamp" yaml:"timestamp"` // ISO8601

	Actor      string  `json:"actor" yaml:"actor"`                                 // "agent"|"user"|"system"
	SkillID    *string `json:"skill_id,omitempty" yaml:"skill_id,omitempty"`
	PlaybookID *string `json:"playbook_id,omitempty" yaml:"playbook_id,omitempty"`
	StepID     *string `json:"step_id,omitempty" yaml:"step_id,omitempty"`

	// Event classification. One of: plan, think, tool_call, tool_result,
	// approval_requested, approval_response, artifact_written, memory_write,
	// evaluation, error.
	EventType string `json:"event_type" yaml:"event_type"`

	ToolRef       *string  `json:"tool_ref,omitempty" yaml:"tool_ref,omitempty"`
	InputHash     *string  `json:"input_hash,omitempty" yaml:"input_hash,omitempty"`
	OutputHash    *string  `json:"output_hash,omitempty" yaml:"output_hash,omitempty"`
	RiskScore     *float64 `json:"risk_score,omitempty" yaml:"risk_score,omitempty"` // 0.0-1.0
	PrincipleRefs []string `json:"principle_refs,omitempty" yaml:"principle_refs,omitempty"`

	Cost  *TraceEventCost    `json:"cost,omitempty" yaml:"cost,omitempty"`
	Data  map[string]any     `json:"data,omitempty" yaml:"data,omitempty"`
	Error *string            `json:"error,omitempty" yaml:"error,omitempty"`
}

// TraceEventCost captures resource usage for a single trace event.
type TraceEventCost struct {
	Tokens *int `json:"tokens,omitempty" yaml:"tokens,omitempty"`
	TimeMs *int `json:"time_ms,omitempty" yaml:"time_ms,omitempty"`
}
