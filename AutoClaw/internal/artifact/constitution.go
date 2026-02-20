package artifact

import "time"

// ConstitutionV1 represents the compiled taste profile.
// Loaded from .tastekit/artifacts/constitution.v1.json (JSON).
type ConstitutionV1 struct {
	SchemaVersion    string                     `json:"schema_version" yaml:"schema_version"`
	GeneratedAt      time.Time                  `json:"generated_at" yaml:"generated_at"`
	GeneratorVersion string                     `json:"generator_version" yaml:"generator_version"`
	UserScope        string                     `json:"user_scope" yaml:"user_scope"`
	Principles       []ConstitutionPrinciple    `json:"principles" yaml:"principles"`
	Tone             ConstitutionTone           `json:"tone" yaml:"tone"`
	Tradeoffs        ConstitutionTradeoffs      `json:"tradeoffs" yaml:"tradeoffs"`
	EvidencePolicy   ConstitutionEvidencePolicy `json:"evidence_policy" yaml:"evidence_policy"`
	Taboos           ConstitutionTaboos         `json:"taboos" yaml:"taboos"`
	TraceMap         map[string]any             `json:"trace_map,omitempty" yaml:"trace_map,omitempty"`
}

// ConstitutionPrinciple defines a single guiding principle.
type ConstitutionPrinciple struct {
	ID           string   `json:"id" yaml:"id"`
	Priority     int      `json:"priority" yaml:"priority"`
	Statement    string   `json:"statement" yaml:"statement"`
	Rationale    *string  `json:"rationale,omitempty" yaml:"rationale,omitempty"`
	AppliesTo    []string `json:"applies_to" yaml:"applies_to"`
	ExamplesGood []string `json:"examples_good,omitempty" yaml:"examples_good,omitempty"`
	ExamplesBad  []string `json:"examples_bad,omitempty" yaml:"examples_bad,omitempty"`
}

// ConstitutionTone defines voice and formatting preferences.
type ConstitutionTone struct {
	VoiceKeywords    []string `json:"voice_keywords" yaml:"voice_keywords"`
	ForbiddenPhrases []string `json:"forbidden_phrases" yaml:"forbidden_phrases"`
	FormattingRules  []string `json:"formatting_rules" yaml:"formatting_rules"`
}

// ConstitutionTradeoffs defines numeric preference scales (0.0-1.0).
type ConstitutionTradeoffs struct {
	AccuracyVsSpeed float64 `json:"accuracy_vs_speed" yaml:"accuracy_vs_speed"`
	CostSensitivity float64 `json:"cost_sensitivity" yaml:"cost_sensitivity"`
	AutonomyLevel   float64 `json:"autonomy_level" yaml:"autonomy_level"`
}

// ConstitutionEvidencePolicy defines citation and uncertainty rules.
type ConstitutionEvidencePolicy struct {
	RequireCitationsFor      []string `json:"require_citations_for" yaml:"require_citations_for"`
	UncertaintyLanguageRules []string `json:"uncertainty_language_rules" yaml:"uncertainty_language_rules"`
}

// ConstitutionTaboos defines hard behavioral boundaries.
type ConstitutionTaboos struct {
	NeverDo      []string `json:"never_do" yaml:"never_do"`
	MustEscalate []string `json:"must_escalate" yaml:"must_escalate"`
}
