package mcpclient

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
)

// ServerConfig holds the configuration for a single MCP server.
type ServerConfig struct {
	Command string            `json:"command"`
	Args    []string          `json:"args,omitempty"`
	Env     map[string]string `json:"env,omitempty"`
	Trust   string            `json:"trust"` // "pinned"|"provisional"
	Version string            `json:"version,omitempty"`
}

// RegistryFile is the on-disk format for .mcp/servers.json.
type RegistryFile struct {
	Servers map[string]ServerConfig `json:"servers"`
}

// Registry manages the set of known MCP servers.
type Registry struct {
	mu      sync.RWMutex
	path    string
	servers map[string]ServerConfig
}

// NewRegistry loads or creates a server registry from the given path.
func NewRegistry(path string) (*Registry, error) {
	r := &Registry{
		path:    path,
		servers: make(map[string]ServerConfig),
	}
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return r, nil // empty registry
	}
	if err != nil {
		return nil, fmt.Errorf("read registry: %w", err)
	}
	var rf RegistryFile
	if err := json.Unmarshal(data, &rf); err != nil {
		return nil, fmt.Errorf("parse registry: %w", err)
	}
	if rf.Servers != nil {
		r.servers = rf.Servers
	}
	return r, nil
}

// List returns all registered server names and configs.
func (r *Registry) List() map[string]ServerConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make(map[string]ServerConfig, len(r.servers))
	for k, v := range r.servers {
		out[k] = v
	}
	return out
}

// Get returns a server config by name.
func (r *Registry) Get(name string) (ServerConfig, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cfg, ok := r.servers[name]
	return cfg, ok
}

// Set adds or updates a server config and persists to disk.
func (r *Registry) Set(name string, cfg ServerConfig) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.servers[name] = cfg
	return r.save()
}

// Remove deletes a server config and persists to disk.
func (r *Registry) Remove(name string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.servers, name)
	return r.save()
}

func (r *Registry) save() error {
	rf := RegistryFile{Servers: r.servers}
	data, err := json.MarshalIndent(rf, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(r.path, data, 0o644)
}
