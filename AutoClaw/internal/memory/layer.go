// Package memory implements AutoClaw's four-layer tiered memory system.
// The layers are: Constitution (immutable), Preferences (drift-tracked),
// Working (30-day rolling window), and Performance (metrics).
package memory

// MemoryLayer is the interface each of the four tiers implements.
type MemoryLayer interface {
	// Name returns the layer name for display/logging.
	Name() string

	// GetContext returns formatted text for this layer's contribution to the system prompt.
	// maxChars is a hint for how much budget this layer has (estimated character count).
	GetContext(maxChars int) string

	// IsReadOnly returns true if the agent cannot write to this layer.
	IsReadOnly() bool
}

// WritableLayer extends MemoryLayer for layers that accept writes.
type WritableLayer interface {
	MemoryLayer

	// Write adds an entry to this layer.
	Write(entry MemoryEntry) error
}
