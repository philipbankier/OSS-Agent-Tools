package artifact

// MemoryV1 defines memory storage and retention policies.
// Loaded from .tastekit/artifacts/memory.v1.yaml (YAML).
type MemoryV1 struct {
	SchemaVersion   string                `json:"schema_version" yaml:"schema_version"`
	RuntimeTarget   string                `json:"runtime_target" yaml:"runtime_target"`
	Stores          []MemoryStore         `json:"stores" yaml:"stores"`
	WritePolicy     MemoryWritePolicy     `json:"write_policy" yaml:"write_policy"`
	RetentionPolicy MemoryRetentionPolicy `json:"retention_policy" yaml:"retention_policy"`
}

// MemoryStore configures a single memory backend.
type MemoryStore struct {
	StoreID string         `json:"store_id" yaml:"store_id"`
	Type    string         `json:"type" yaml:"type"`
	Config  map[string]any `json:"config" yaml:"config"`
}

// MemoryWritePolicy controls how memories are written and consolidated.
type MemoryWritePolicy struct {
	SalienceRules         []SalienceRule `json:"salience_rules" yaml:"salience_rules"`
	PIIHandling           PIIHandling    `json:"pii_handling" yaml:"pii_handling"`
	UpdateMode            string         `json:"update_mode" yaml:"update_mode"` // "append"|"revise"|"consolidate"
	ConsolidationSchedule *string        `json:"consolidation_schedule,omitempty" yaml:"consolidation_schedule,omitempty"`
	RevisitTriggers       []string       `json:"revisit_triggers" yaml:"revisit_triggers"`
}

// SalienceRule scores memory relevance based on pattern matching.
type SalienceRule struct {
	RuleID  string  `json:"rule_id" yaml:"rule_id"`
	Pattern string  `json:"pattern" yaml:"pattern"`
	Score   float64 `json:"score" yaml:"score"` // 0.0-1.0
	Reason  *string `json:"reason,omitempty" yaml:"reason,omitempty"`
}

// PIIHandling controls personally identifiable information processing.
type PIIHandling struct {
	Detect          bool `json:"detect" yaml:"detect"`
	Redact          bool `json:"redact" yaml:"redact"`
	StoreSeparately bool `json:"store_separately" yaml:"store_separately"`
}

// MemoryRetentionPolicy defines when old memories are pruned.
type MemoryRetentionPolicy struct {
	TTLDays       *int   `json:"ttl_days,omitempty" yaml:"ttl_days,omitempty"`
	PruneStrategy string `json:"prune_strategy" yaml:"prune_strategy"` // "oldest"|"least_salient"|"manual"
}
