package artifact

import (
	"fmt"
	"strings"
)

// --- Validation functions ---

func validateConstitution(c *ConstitutionV1) error {
	if c.SchemaVersion == "" {
		return fmt.Errorf("missing schema_version")
	}
	if c.UserScope == "" {
		return fmt.Errorf("missing user_scope")
	}
	if len(c.Principles) == 0 {
		return fmt.Errorf("at least one principle is required")
	}
	for i, p := range c.Principles {
		if p.ID == "" {
			return fmt.Errorf("principle[%d]: missing id", i)
		}
		if p.Statement == "" {
			return fmt.Errorf("principle[%d]: missing statement", i)
		}
	}
	if err := validateFloat01("accuracy_vs_speed", c.Tradeoffs.AccuracyVsSpeed); err != nil {
		return err
	}
	if err := validateFloat01("cost_sensitivity", c.Tradeoffs.CostSensitivity); err != nil {
		return err
	}
	if err := validateFloat01("autonomy_level", c.Tradeoffs.AutonomyLevel); err != nil {
		return err
	}
	return nil
}

func validateGuardrails(g *GuardrailsV1) error {
	if g.SchemaVersion == "" {
		return fmt.Errorf("missing schema_version")
	}
	validOps := map[string]bool{
		"read": true, "write": true, "delete": true, "execute": true,
		"post": true, "publish": true, "admin": true,
	}
	for i, p := range g.Permissions {
		if p.ScopeID == "" {
			return fmt.Errorf("permission[%d]: missing scope_id", i)
		}
		if p.ToolRef == "" {
			return fmt.Errorf("permission[%d]: missing tool_ref", i)
		}
		for _, op := range p.Ops {
			if !validOps[op] {
				return fmt.Errorf("permission[%d]: invalid op %q", i, op)
			}
		}
	}
	validActions := map[string]bool{"require_approval": true, "block": true, "allow": true}
	for i, a := range g.Approvals {
		if a.RuleID == "" {
			return fmt.Errorf("approval[%d]: missing rule_id", i)
		}
		if !validActions[a.Action] {
			return fmt.Errorf("approval[%d]: invalid action %q", i, a.Action)
		}
	}
	return nil
}

func validateMemory(m *MemoryV1) error {
	if m.SchemaVersion == "" {
		return fmt.Errorf("missing schema_version")
	}
	validUpdateModes := map[string]bool{"append": true, "revise": true, "consolidate": true}
	if !validUpdateModes[m.WritePolicy.UpdateMode] {
		return fmt.Errorf("invalid update_mode %q", m.WritePolicy.UpdateMode)
	}
	for i, s := range m.WritePolicy.SalienceRules {
		if err := validateFloat01(fmt.Sprintf("salience_rule[%d].score", i), s.Score); err != nil {
			return err
		}
	}
	validPrune := map[string]bool{"oldest": true, "least_salient": true, "manual": true}
	if !validPrune[m.RetentionPolicy.PruneStrategy] {
		return fmt.Errorf("invalid prune_strategy %q", m.RetentionPolicy.PruneStrategy)
	}
	return nil
}

func validateBindings(b *BindingsV1) error {
	if b.SchemaVersion == "" {
		return fmt.Errorf("missing schema_version")
	}
	for i, s := range b.Servers {
		if s.Name == "" {
			return fmt.Errorf("server[%d]: missing name", i)
		}
		if s.URL == "" {
			return fmt.Errorf("server[%d]: missing url", i)
		}
		for j, t := range s.Tools {
			if t.ToolRef == "" {
				return fmt.Errorf("server[%d].tool[%d]: missing tool_ref", i, j)
			}
		}
	}
	return nil
}

func validateTrust(t *TrustV1) error {
	if t.SchemaVersion == "" {
		return fmt.Errorf("missing schema_version")
	}
	validPinModes := map[string]bool{"strict": true, "warn": true}
	for i, s := range t.MCPServers {
		if s.URL == "" {
			return fmt.Errorf("mcp_server[%d]: missing url", i)
		}
		if s.Fingerprint == "" {
			return fmt.Errorf("mcp_server[%d]: missing fingerprint", i)
		}
		if !validPinModes[s.PinMode] {
			return fmt.Errorf("mcp_server[%d]: invalid pin_mode %q", i, s.PinMode)
		}
	}
	validSourceTypes := map[string]bool{"local": true, "git": true}
	for i, s := range t.SkillSources {
		if !validSourceTypes[s.Type] {
			return fmt.Errorf("skill_source[%d]: invalid type %q", i, s.Type)
		}
		if !validPinModes[s.PinMode] {
			return fmt.Errorf("skill_source[%d]: invalid pin_mode %q", i, s.PinMode)
		}
	}
	return nil
}

func validateSkillsManifest(s *SkillsManifestV1) error {
	if s.SchemaVersion == "" {
		return fmt.Errorf("missing schema_version")
	}
	validRisk := map[string]bool{"low": true, "med": true, "high": true}
	for i, sk := range s.Skills {
		if sk.SkillID == "" {
			return fmt.Errorf("skill[%d]: missing skill_id", i)
		}
		if sk.Name == "" {
			return fmt.Errorf("skill[%d]: missing name", i)
		}
		if !validRisk[sk.RiskLevel] {
			return fmt.Errorf("skill[%d]: invalid risk_level %q", i, sk.RiskLevel)
		}
	}
	return nil
}

func validatePlaybook(p *PlaybookV1) error {
	if p.SchemaVersion == "" {
		return fmt.Errorf("missing schema_version")
	}
	if p.ID == "" {
		return fmt.Errorf("missing id")
	}
	if p.Name == "" {
		return fmt.Errorf("missing name")
	}
	validTriggers := map[string]bool{"cron": true, "event": true, "manual": true}
	for i, t := range p.Triggers {
		if !validTriggers[t.Type] {
			return fmt.Errorf("trigger[%d]: invalid type %q", i, t.Type)
		}
	}
	validStepTypes := map[string]bool{"think": true, "tool": true, "transform": true, "write": true, "approval_gate": true}
	for i, s := range p.Steps {
		if s.StepID == "" {
			return fmt.Errorf("step[%d]: missing step_id", i)
		}
		if !validStepTypes[s.Type] {
			return fmt.Errorf("step[%d]: invalid type %q", i, s.Type)
		}
	}
	validCheckTypes := map[string]bool{"taste": true, "safety": true, "format": true, "facts": true}
	for i, c := range p.Checks {
		if c.CheckID == "" {
			return fmt.Errorf("check[%d]: missing check_id", i)
		}
		if !validCheckTypes[c.Type] {
			return fmt.Errorf("check[%d]: invalid type %q", i, c.Type)
		}
	}
	return nil
}

func validateEvalPack(ep *EvalPackV1) error {
	if ep.SchemaVersion == "" {
		return fmt.Errorf("missing schema_version")
	}
	if ep.ID == "" {
		return fmt.Errorf("missing id")
	}
	if ep.Name == "" {
		return fmt.Errorf("missing name")
	}
	validRuleTypes := map[string]bool{"deterministic": true, "llm_judge": true, "regex": true, "schema": true}
	for i, r := range ep.Judging.Rules {
		if r.RuleID == "" {
			return fmt.Errorf("judging.rule[%d]: missing rule_id", i)
		}
		if !validRuleTypes[r.Type] {
			return fmt.Errorf("judging.rule[%d]: invalid type %q", i, r.Type)
		}
		if err := validateFloat01(fmt.Sprintf("judging.rule[%d].weight", i), r.Weight); err != nil {
			return err
		}
	}
	for i, s := range ep.Scenarios {
		if s.ScenarioID == "" {
			return fmt.Errorf("scenario[%d]: missing scenario_id", i)
		}
		if s.Name == "" {
			return fmt.Errorf("scenario[%d]: missing name", i)
		}
	}
	return nil
}

// --- Helpers ---

func validateFloat01(field string, v float64) error {
	if v < 0.0 || v > 1.0 {
		return fmt.Errorf("%s must be between 0.0 and 1.0, got %f", field, v)
	}
	return nil
}

// validateEnum checks that a value is one of the allowed values.
// Used by callers that want custom error messages.
func validateEnum(field, value string, allowed []string) error {
	for _, a := range allowed {
		if value == a {
			return nil
		}
	}
	return fmt.Errorf("%s: invalid value %q (allowed: %s)", field, value, strings.Join(allowed, ", "))
}
