package artifact

// SkillsManifestV1 lists all registered skill metadata.
// Loaded from .tastekit/artifacts/skills/manifest.v1.yaml (YAML).
type SkillsManifestV1 struct {
	SchemaVersion string          `json:"schema_version" yaml:"schema_version"`
	Skills        []SkillMetadata `json:"skills" yaml:"skills"`
}

// SkillMetadata describes a single skill's capabilities and requirements.
type SkillMetadata struct {
	SkillID            string   `json:"skill_id" yaml:"skill_id"`
	Name               string   `json:"name" yaml:"name"`
	Description        string   `json:"description" yaml:"description"`
	Tags               []string `json:"tags" yaml:"tags"`
	RiskLevel          string   `json:"risk_level" yaml:"risk_level"` // "low"|"med"|"high"
	RequiredTools      []string `json:"required_tools" yaml:"required_tools"`
	CompatibleRuntimes []string `json:"compatible_runtimes" yaml:"compatible_runtimes"`
	PlaybookRef        *string  `json:"playbook_ref,omitempty" yaml:"playbook_ref,omitempty"`
}
