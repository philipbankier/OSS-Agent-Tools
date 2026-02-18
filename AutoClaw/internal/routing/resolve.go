package routing

// ResolveAgentRoute finds the best-matching agent for a given context.
// Uses OpenClaw's 8-tier priority system (lower tier = more specific match):
//
//	Tier 1: peer (exact channel + account + peer match)
//	Tier 2: peer.parent (channel + account + guild/team)
//	Tier 3: guild + roles (Discord server with matching roles)
//	Tier 4: guild (Discord server, any role)
//	Tier 5: team (Slack team)
//	Tier 6: account (channel + account wildcard)
//	Tier 7: channel (channel-level default)
//	Tier 8: default (global fallback)
//
// In Phase 3, single-agent mode always resolves to agent "default" at tier 8.
func ResolveAgentRoute(bindings []AgentBinding, channel, accountID, peerKind, peerID, guildID, teamID string, roleIDs []string) *ResolvedAgentRoute {
	var best *resolveCandidate

	for _, b := range bindings {
		tier, name := matchTier(b, channel, accountID, peerKind, peerID, guildID, teamID, roleIDs)
		if tier == 0 {
			continue // no match
		}
		if best == nil || tier < best.tier {
			best = &resolveCandidate{agentID: b.AgentID, tier: tier, tierName: name}
		}
	}

	if best != nil {
		return &ResolvedAgentRoute{
			AgentID:  best.agentID,
			Tier:     best.tier,
			TierName: best.tierName,
		}
	}

	// Fallback to "default" agent.
	return &ResolvedAgentRoute{
		AgentID:  "default",
		Tier:     8,
		TierName: "default",
	}
}

type resolveCandidate struct {
	agentID  string
	tier     int
	tierName string
}

func matchTier(b AgentBinding, channel, accountID, peerKind, peerID, guildID, teamID string, roleIDs []string) (int, string) {
	// Tier 1: exact peer match.
	if b.Channel == channel && b.AccountID == accountID && b.PeerKind == peerKind && b.PeerID == peerID && b.PeerID != "" {
		return 1, "peer"
	}

	// Tier 2: peer parent (channel + account + guild/team).
	if b.Channel == channel && b.AccountID == accountID && b.GuildID != "" && b.GuildID == guildID && b.PeerID == "" {
		return 2, "peer.parent"
	}

	// Tier 3: guild + roles.
	if b.Channel == channel && b.GuildID == guildID && b.GuildID != "" && len(b.Roles) > 0 && hasAnyRole(b.Roles, roleIDs) {
		return 3, "guild+roles"
	}

	// Tier 4: guild only.
	if b.Channel == channel && b.GuildID == guildID && b.GuildID != "" && len(b.Roles) == 0 {
		return 4, "guild"
	}

	// Tier 5: team.
	if b.Channel == channel && b.TeamID == teamID && b.TeamID != "" {
		return 5, "team"
	}

	// Tier 6: specific account (not wildcard).
	if b.Channel == channel && b.AccountID == accountID && b.AccountID != "*" && b.PeerID == "" && b.GuildID == "" && b.TeamID == "" {
		return 6, "account"
	}

	// Tier 7: channel (wildcard account).
	if b.Channel == channel && b.AccountID == "*" && b.PeerID == "" && b.GuildID == "" && b.TeamID == "" {
		return 7, "channel"
	}

	// Tier 8: default (wildcard everything).
	if b.Channel == "*" && b.AccountID == "*" {
		return 8, "default"
	}

	return 0, ""
}

func hasAnyRole(required, actual []string) bool {
	roleSet := make(map[string]bool, len(actual))
	for _, r := range actual {
		roleSet[r] = true
	}
	for _, r := range required {
		if roleSet[r] {
			return true
		}
	}
	return false
}
