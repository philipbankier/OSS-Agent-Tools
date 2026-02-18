package artifact

// PlaybookV1 defines an executable multi-step procedure.
// Loaded from .tastekit/artifacts/playbooks/<id>.v1.yaml (YAML).
type PlaybookV1 struct {
	SchemaVersion  string                `json:"schema_version" yaml:"schema_version"`
	ID             string                `json:"id" yaml:"id"`
	Name           string                `json:"name" yaml:"name"`
	Description    string                `json:"description" yaml:"description"`
	Triggers       []PlaybookTrigger     `json:"triggers" yaml:"triggers"`
	Inputs         []PlaybookInput       `json:"inputs" yaml:"inputs"`
	Steps          []PlaybookStep        `json:"steps" yaml:"steps"`
	Checks         []PlaybookCheck       `json:"checks" yaml:"checks"`
	StopConditions []PlaybookStopCond    `json:"stop_conditions" yaml:"stop_conditions"`
	Escalations    []PlaybookEscalation  `json:"escalations" yaml:"escalations"`
}

// PlaybookTrigger defines when a playbook is invoked.
type PlaybookTrigger struct {
	Type         string  `json:"type" yaml:"type"` // "cron"|"event"|"manual"
	Schedule     *string `json:"schedule,omitempty" yaml:"schedule,omitempty"`
	EventPattern *string `json:"event_pattern,omitempty" yaml:"event_pattern,omitempty"`
}

// PlaybookInput declares a parameter the playbook requires.
type PlaybookInput struct {
	Name        string  `json:"name" yaml:"name"`
	Type        string  `json:"type" yaml:"type"` // e.g. "string", "number", "resource"
	Required    bool    `json:"required" yaml:"required"`
	Description *string `json:"description,omitempty" yaml:"description,omitempty"`
}

// PlaybookStep is a single action within the playbook.
type PlaybookStep struct {
	StepID         string         `json:"step_id" yaml:"step_id"`
	Type           string         `json:"type" yaml:"type"` // "think"|"tool"|"transform"|"write"|"approval_gate"
	ToolRef        *string        `json:"tool_ref,omitempty" yaml:"tool_ref,omitempty"`
	ParamsTemplate map[string]any `json:"params_template,omitempty" yaml:"params_template,omitempty"`
	Outputs        []string       `json:"outputs,omitempty" yaml:"outputs,omitempty"`
}

// PlaybookCheck validates output quality.
type PlaybookCheck struct {
	CheckID   string  `json:"check_id" yaml:"check_id"`
	Type      string  `json:"type" yaml:"type"` // "taste"|"safety"|"format"|"facts"
	RubricRef *string `json:"rubric_ref,omitempty" yaml:"rubric_ref,omitempty"`
	Condition string  `json:"condition" yaml:"condition"`
}

// PlaybookStopCond defines when the playbook should halt.
type PlaybookStopCond struct {
	Condition string `json:"condition" yaml:"condition"`
	Reason    string `json:"reason" yaml:"reason"`
}

// PlaybookEscalation defines when to request human approval.
type PlaybookEscalation struct {
	EscalationID string `json:"escalation_id" yaml:"escalation_id"`
	Trigger      string `json:"trigger" yaml:"trigger"`
	ApprovalRef  string `json:"approval_ref" yaml:"approval_ref"`
}
