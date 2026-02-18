package mcpclient

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
)

// TrustPin records a pinned fingerprint for an MCP server.
type TrustPin struct {
	Fingerprint string `json:"fingerprint"`
	PinMode     string `json:"pin_mode"` // "strict"|"warn"
	PinnedAt    string `json:"pinned_at"`
}

// TrustFile is the on-disk format for .mcp/trust.json.
type TrustFile struct {
	Pins map[string]TrustPin `json:"pins"` // server name → pin
}

// TrustManager handles fingerprint pinning for MCP servers.
type TrustManager struct {
	mu   sync.RWMutex
	path string
	pins map[string]TrustPin
}

// NewTrustManager loads or creates the trust file at the given path.
func NewTrustManager(path string) (*TrustManager, error) {
	tm := &TrustManager{
		path: path,
		pins: make(map[string]TrustPin),
	}
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return tm, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read trust: %w", err)
	}
	var tf TrustFile
	if err := json.Unmarshal(data, &tf); err != nil {
		return nil, fmt.Errorf("parse trust: %w", err)
	}
	if tf.Pins != nil {
		tm.pins = tf.Pins
	}
	return tm, nil
}

// Pin stores or updates a fingerprint pin for a server.
func (tm *TrustManager) Pin(serverName string, pin TrustPin) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()
	tm.pins[serverName] = pin
	return tm.save()
}

// Verify checks whether the given fingerprint matches the pinned value.
// Returns (trusted bool, warning string).
func (tm *TrustManager) Verify(serverName, fingerprint string) (bool, string) {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	pin, ok := tm.pins[serverName]
	if !ok {
		return false, fmt.Sprintf("no trust pin for server %q", serverName)
	}
	if pin.Fingerprint != fingerprint {
		msg := fmt.Sprintf("fingerprint mismatch for %q: pinned=%q got=%q", serverName, pin.Fingerprint, fingerprint)
		if pin.PinMode == "strict" {
			return false, msg
		}
		// warn mode: trusted but with warning
		return true, msg
	}
	return true, ""
}

// Get returns the pin for a server, if any.
func (tm *TrustManager) Get(serverName string) (TrustPin, bool) {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	pin, ok := tm.pins[serverName]
	return pin, ok
}

// ListPins returns all trust pins.
func (tm *TrustManager) ListPins() map[string]TrustPin {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	out := make(map[string]TrustPin, len(tm.pins))
	for k, v := range tm.pins {
		out[k] = v
	}
	return out
}

func (tm *TrustManager) save() error {
	tf := TrustFile{Pins: tm.pins}
	data, err := json.MarshalIndent(tf, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(tm.path, data, 0o644)
}
