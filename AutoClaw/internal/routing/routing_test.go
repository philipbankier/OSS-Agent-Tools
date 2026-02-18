package routing

import "testing"

// --- Session Key Tests ---

func TestSessionKey(t *testing.T) {
	key := SessionKey("brand-agent", "telegram", "direct", "user123")
	want := "agent:brand-agent:telegram:direct:user123"
	if key != want {
		t.Errorf("SessionKey = %q, want %q", key, want)
	}
}

func TestMainSessionKey(t *testing.T) {
	key := MainSessionKey("brand-agent")
	want := "agent:brand-agent:main"
	if key != want {
		t.Errorf("MainSessionKey = %q, want %q", key, want)
	}
}

func TestCronSessionKey(t *testing.T) {
	key := CronSessionKey("brand-agent", "daily-report", "run-42")
	want := "agent:brand-agent:cron:daily-report:run:run-42"
	if key != want {
		t.Errorf("CronSessionKey = %q, want %q", key, want)
	}
}

func TestSubagentSessionKey(t *testing.T) {
	key := SubagentSessionKey("brand-agent", "parent-session", "sub-1")
	want := "agent:brand-agent:subagent:parent-session:sub-1"
	if key != want {
		t.Errorf("SubagentSessionKey = %q, want %q", key, want)
	}
}

func TestDefaultSessionKey(t *testing.T) {
	key := DefaultSessionKey("telegram", "chat456")
	want := "agent:default:telegram:direct:chat456"
	if key != want {
		t.Errorf("DefaultSessionKey = %q, want %q", key, want)
	}
}

func TestParseSessionKey(t *testing.T) {
	tests := []struct {
		input   string
		agentID string
		rest    string
		wantErr bool
	}{
		{"agent:brand:main", "brand", "main", false},
		{"agent:brand:telegram:direct:user1", "brand", "telegram:direct:user1", false},
		{"agent:default:cron:daily:run:42", "default", "cron:daily:run:42", false},
		{"invalid-key", "", "", true},
		{"notagent:brand:main", "", "", true},
	}
	for _, tt := range tests {
		parsed, err := ParseSessionKey(tt.input)
		if tt.wantErr {
			if err == nil {
				t.Errorf("ParseSessionKey(%q) should fail", tt.input)
			}
			continue
		}
		if err != nil {
			t.Errorf("ParseSessionKey(%q): %v", tt.input, err)
			continue
		}
		if parsed.AgentID != tt.agentID {
			t.Errorf("ParseSessionKey(%q).AgentID = %q, want %q", tt.input, parsed.AgentID, tt.agentID)
		}
		if parsed.Rest != tt.rest {
			t.Errorf("ParseSessionKey(%q).Rest = %q, want %q", tt.input, parsed.Rest, tt.rest)
		}
	}
}

// --- Routing Resolution Tests ---

func TestResolve_ExactPeerMatch(t *testing.T) {
	bindings := []AgentBinding{
		{AgentID: "generic", Channel: "*", AccountID: "*"},
		{AgentID: "vip-agent", Channel: "telegram", AccountID: "acc1", PeerKind: "direct", PeerID: "user42"},
	}
	route := ResolveAgentRoute(bindings, "telegram", "acc1", "direct", "user42", "", "", nil)
	if route.AgentID != "vip-agent" {
		t.Errorf("agent = %q, want %q", route.AgentID, "vip-agent")
	}
	if route.Tier != 1 {
		t.Errorf("tier = %d, want 1", route.Tier)
	}
}

func TestResolve_GuildMatch(t *testing.T) {
	bindings := []AgentBinding{
		{AgentID: "generic", Channel: "*", AccountID: "*"},
		{AgentID: "discord-agent", Channel: "discord", GuildID: "guild-abc"},
	}
	route := ResolveAgentRoute(bindings, "discord", "acc1", "group", "chan1", "guild-abc", "", nil)
	if route.AgentID != "discord-agent" {
		t.Errorf("agent = %q, want %q", route.AgentID, "discord-agent")
	}
	if route.Tier != 4 {
		t.Errorf("tier = %d, want 4", route.Tier)
	}
}

func TestResolve_GuildWithRoles(t *testing.T) {
	bindings := []AgentBinding{
		{AgentID: "admin-agent", Channel: "discord", GuildID: "guild-abc", Roles: []string{"admin"}},
		{AgentID: "member-agent", Channel: "discord", GuildID: "guild-abc"},
	}
	route := ResolveAgentRoute(bindings, "discord", "acc1", "group", "chan1", "guild-abc", "", []string{"admin", "member"})
	if route.AgentID != "admin-agent" {
		t.Errorf("agent = %q, want %q (role match should win)", route.AgentID, "admin-agent")
	}
	if route.Tier != 3 {
		t.Errorf("tier = %d, want 3", route.Tier)
	}
}

func TestResolve_TeamMatch(t *testing.T) {
	bindings := []AgentBinding{
		{AgentID: "generic", Channel: "*", AccountID: "*"},
		{AgentID: "slack-agent", Channel: "slack", TeamID: "team-xyz"},
	}
	route := ResolveAgentRoute(bindings, "slack", "acc1", "direct", "user1", "", "team-xyz", nil)
	if route.AgentID != "slack-agent" {
		t.Errorf("agent = %q, want %q", route.AgentID, "slack-agent")
	}
	if route.Tier != 5 {
		t.Errorf("tier = %d, want 5", route.Tier)
	}
}

func TestResolve_ChannelDefault(t *testing.T) {
	bindings := []AgentBinding{
		{AgentID: "tg-default", Channel: "telegram", AccountID: "*"},
	}
	route := ResolveAgentRoute(bindings, "telegram", "any-acc", "direct", "any-user", "", "", nil)
	if route.AgentID != "tg-default" {
		t.Errorf("agent = %q, want %q", route.AgentID, "tg-default")
	}
	if route.Tier != 7 {
		t.Errorf("tier = %d, want 7", route.Tier)
	}
}

func TestResolve_GlobalDefault(t *testing.T) {
	bindings := []AgentBinding{
		{AgentID: "global", Channel: "*", AccountID: "*"},
	}
	route := ResolveAgentRoute(bindings, "whatsapp", "acc1", "direct", "user1", "", "", nil)
	if route.AgentID != "global" {
		t.Errorf("agent = %q, want %q", route.AgentID, "global")
	}
	if route.Tier != 8 {
		t.Errorf("tier = %d, want 8", route.Tier)
	}
}

func TestResolve_NoBindingsFallback(t *testing.T) {
	route := ResolveAgentRoute(nil, "telegram", "acc1", "direct", "user1", "", "", nil)
	if route.AgentID != "default" {
		t.Errorf("agent = %q, want %q (fallback)", route.AgentID, "default")
	}
	if route.Tier != 8 {
		t.Errorf("tier = %d, want 8", route.Tier)
	}
}

func TestResolve_MostSpecificWins(t *testing.T) {
	bindings := []AgentBinding{
		{AgentID: "global", Channel: "*", AccountID: "*"},
		{AgentID: "channel", Channel: "telegram", AccountID: "*"},
		{AgentID: "peer", Channel: "telegram", AccountID: "acc1", PeerKind: "direct", PeerID: "user1"},
	}
	route := ResolveAgentRoute(bindings, "telegram", "acc1", "direct", "user1", "", "", nil)
	if route.AgentID != "peer" {
		t.Errorf("most specific binding should win, got %q", route.AgentID)
	}
	if route.Tier != 1 {
		t.Errorf("tier = %d, want 1", route.Tier)
	}
}
