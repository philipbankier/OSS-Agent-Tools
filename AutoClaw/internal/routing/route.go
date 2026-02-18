// Package routing implements multi-agent routing based on OpenClaw's binding model.
// Phase 3 uses single-agent mode (agent "default"); the scaffold is ready for
// Phase 4 multi-agent orchestration without architecture changes.
package routing

// AgentBinding maps a channel+account+peer combination to an agent.
// Modeled after OpenClaw's binding resolution system.
type AgentBinding struct {
	AgentID   string   `json:"agent_id"`
	Channel   string   `json:"channel"`                     // e.g. "telegram", "discord", "*"
	AccountID string   `json:"account_id"`                  // "*" for wildcard
	PeerKind  string   `json:"peer_kind,omitempty"`         // "direct"|"group"|""
	PeerID    string   `json:"peer_id,omitempty"`
	GuildID   string   `json:"guild_id,omitempty"`          // Discord server
	TeamID    string   `json:"team_id,omitempty"`           // Slack team
	Roles     []string `json:"roles,omitempty"`
}

// ResolvedAgentRoute is the result of binding resolution.
type ResolvedAgentRoute struct {
	AgentID  string `json:"agent_id"`
	Tier     int    `json:"tier"`      // 1-8, lower = more specific match
	TierName string `json:"tier_name"` // human-readable tier description
}

// AgentConfig describes a single agent in multi-agent mode.
type AgentConfig struct {
	AgentID      string   `json:"agent_id"`
	WorkspaceDir string   `json:"workspace_dir"`
	Provider     string   `json:"provider"`
	Model        string   `json:"model"`
	Skills       []string `json:"skills,omitempty"`
	ToolsAllow   []string `json:"tools_allow,omitempty"`
	ToolsDeny    []string `json:"tools_deny,omitempty"`
}
