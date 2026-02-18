package artifact

// EvalPackV1 defines a set of evaluation scenarios and judging rules.
// Loaded from .tastekit/artifacts/evals/<id>.yaml (YAML).
type EvalPackV1 struct {
	SchemaVersion string         `json:"schema_version" yaml:"schema_version"`
	ID            string         `json:"id" yaml:"id"`
	Name          string         `json:"name" yaml:"name"`
	Description   string         `json:"description" yaml:"description"`
	Scenarios     []EvalScenario `json:"scenarios" yaml:"scenarios"`
	Judging       EvalJudging    `json:"judging" yaml:"judging"`
}

// EvalScenario defines a single test case.
type EvalScenario struct {
	ScenarioID  string               `json:"scenario_id" yaml:"scenario_id"`
	Name        string               `json:"name" yaml:"name"`
	Description string               `json:"description" yaml:"description"`
	Setup       EvalScenarioSetup    `json:"setup" yaml:"setup"`
	Expected    EvalScenarioExpected `json:"expected" yaml:"expected"`
}

// EvalScenarioSetup provides inputs and context for the scenario.
type EvalScenarioSetup struct {
	Inputs    map[string]any `json:"inputs" yaml:"inputs"`
	Resources []string       `json:"resources,omitempty" yaml:"resources,omitempty"`
	Context   *string        `json:"context,omitempty" yaml:"context,omitempty"`
}

// EvalScenarioExpected defines pass criteria.
type EvalScenarioExpected struct {
	Rubrics         []string           `json:"rubrics" yaml:"rubrics"`
	Thresholds      map[string]float64 `json:"thresholds" yaml:"thresholds"`
	RequiredOutputs []string           `json:"required_outputs,omitempty" yaml:"required_outputs,omitempty"`
}

// EvalJudging configures how evaluation results are scored.
type EvalJudging struct {
	Rules        []EvalJudgingRule `json:"rules" yaml:"rules"`
	OutputFormat string            `json:"output_format" yaml:"output_format"`
}

// EvalJudgingRule defines a single scoring criterion.
type EvalJudgingRule struct {
	RuleID   string   `json:"rule_id" yaml:"rule_id"`
	Type     string   `json:"type" yaml:"type"` // "deterministic"|"llm_judge"|"regex"|"schema"
	Pattern  *string  `json:"pattern,omitempty" yaml:"pattern,omitempty"`
	Template *string  `json:"template,omitempty" yaml:"template,omitempty"`
	Weight   float64  `json:"weight" yaml:"weight"` // 0.0-1.0, default 1.0
}
