package agent

// MemoryProvider abstracts memory context retrieval for the agent's system prompt.
// Implemented by both the flat MemoryStore (PicoClaw fallback) and TieredMemoryStore.
type MemoryProvider interface {
	// GetMemoryContext returns formatted memory text for injection into the system prompt.
	GetMemoryContext() string

	// AppendWorkingMemory records an observation to working memory.
	// For flat MemoryStore, this maps to AppendToday().
	AppendWorkingMemory(content string, salience float64) error

	// UpdateLongTermMemory rewrites long-term / preferences memory.
	// For flat MemoryStore, this maps to WriteLongTerm().
	UpdateLongTermMemory(content string) error
}
