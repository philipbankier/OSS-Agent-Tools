package routing

import (
	"fmt"
	"strings"
)

// SessionKey constructs an agent-scoped session key.
// Format: agent:<agentID>:<channel>:<peerKind>:<peerID>
// This matches OpenClaw's colon-delimited session key format.
func SessionKey(agentID, channel, peerKind, peerID string) string {
	return fmt.Sprintf("agent:%s:%s:%s:%s", agentID, channel, peerKind, peerID)
}

// MainSessionKey returns the primary DM session key for an agent.
func MainSessionKey(agentID string) string {
	return fmt.Sprintf("agent:%s:main", agentID)
}

// CronSessionKey returns a session key for a cron job run.
func CronSessionKey(agentID, cronName, runID string) string {
	return fmt.Sprintf("agent:%s:cron:%s:run:%s", agentID, cronName, runID)
}

// SubagentSessionKey returns a session key for a subagent.
func SubagentSessionKey(agentID, parentSessionKey, subagentID string) string {
	return fmt.Sprintf("agent:%s:subagent:%s:%s", agentID, parentSessionKey, subagentID)
}

// ParsedSessionKey holds the components of a session key.
type ParsedSessionKey struct {
	AgentID string
	Rest    string // Everything after agent:<agentID>:
}

// ParseSessionKey extracts the agent ID and remainder from a session key.
func ParseSessionKey(key string) (*ParsedSessionKey, error) {
	parts := strings.SplitN(key, ":", 3)
	if len(parts) < 2 || parts[0] != "agent" {
		return nil, fmt.Errorf("invalid session key format: %q (expected agent:<id>:<rest>)", key)
	}
	rest := ""
	if len(parts) == 3 {
		rest = parts[2]
	}
	return &ParsedSessionKey{
		AgentID: parts[1],
		Rest:    rest,
	}, nil
}

// DefaultSessionKey returns the session key using agent "default".
// This is the backward-compatible key for Phase 3 single-agent mode.
func DefaultSessionKey(channel, chatID string) string {
	return SessionKey("default", channel, "direct", chatID)
}
