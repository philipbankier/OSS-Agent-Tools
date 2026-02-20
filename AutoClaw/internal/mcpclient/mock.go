package mcpclient

import (
	"context"
	"fmt"
)

// MockClient implements Client for testing. Configure tools and responses
// before use; all call results are stored for assertion.
type MockClient struct {
	name        string
	fingerprint string
	tools       []ToolInfo
	responses   map[string]*CallResult // tool name → result
	calls       []MockCall             // recorded calls
	connected   bool
}

// MockCall records a single tool invocation.
type MockCall struct {
	ToolName string
	Args     map[string]interface{}
}

// NewMockClient creates a test MCP client.
func NewMockClient(name, fingerprint string) *MockClient {
	return &MockClient{
		name:        name,
		fingerprint: fingerprint,
		responses:   make(map[string]*CallResult),
	}
}

// AddTool registers a tool the mock server offers.
func (m *MockClient) AddTool(info ToolInfo) {
	m.tools = append(m.tools, info)
}

// SetResponse configures the result for a named tool.
func (m *MockClient) SetResponse(toolName string, result *CallResult) {
	m.responses[toolName] = result
}

// Calls returns all recorded tool invocations.
func (m *MockClient) Calls() []MockCall {
	return m.calls
}

func (m *MockClient) Connect(_ context.Context) error {
	m.connected = true
	return nil
}

func (m *MockClient) Close() error {
	m.connected = false
	return nil
}

func (m *MockClient) ListTools(_ context.Context) ([]ToolInfo, error) {
	if !m.connected {
		return nil, fmt.Errorf("not connected")
	}
	return m.tools, nil
}

func (m *MockClient) CallTool(_ context.Context, name string, args map[string]interface{}) (*CallResult, error) {
	if !m.connected {
		return nil, fmt.Errorf("not connected")
	}
	m.calls = append(m.calls, MockCall{ToolName: name, Args: args})
	if r, ok := m.responses[name]; ok {
		return r, nil
	}
	return nil, fmt.Errorf("no response configured for tool %q", name)
}

func (m *MockClient) ServerName() string  { return m.name }
func (m *MockClient) Fingerprint() string { return m.fingerprint }
