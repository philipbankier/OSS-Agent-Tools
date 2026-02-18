package mcpclient

import "testing"

// mockTool implements WrappableTool for testing.
type mockTool struct {
	name   string
	desc   string
	params map[string]interface{}
}

func (m *mockTool) Name() string                      { return m.name }
func (m *mockTool) Description() string               { return m.desc }
func (m *mockTool) Parameters() map[string]interface{} { return m.params }

func TestWrapBuiltinTool(t *testing.T) {
	tool := &mockTool{
		name: "read_file",
		desc: "Read a file from the filesystem",
		params: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"path": map[string]interface{}{"type": "string"},
			},
		},
	}

	info := WrapBuiltinTool(tool)

	if info.Name != "read_file" {
		t.Errorf("Name = %q, want %q", info.Name, "read_file")
	}
	if info.Description != "Read a file from the filesystem" {
		t.Errorf("Description = %q", info.Description)
	}
	if info.InputSchema["type"] != "object" {
		t.Error("expected InputSchema to have type=object")
	}
}

func TestWrapBuiltinTools(t *testing.T) {
	tools := []WrappableTool{
		&mockTool{name: "read_file", desc: "Read file"},
		&mockTool{name: "exec", desc: "Execute command"},
		&mockTool{name: "write_file", desc: "Write file"},
	}

	infos := WrapBuiltinTools(tools)

	if len(infos) != 3 {
		t.Fatalf("expected 3 infos, got %d", len(infos))
	}
	if infos[0].Name != "read_file" {
		t.Errorf("infos[0].Name = %q", infos[0].Name)
	}
	if infos[2].Name != "write_file" {
		t.Errorf("infos[2].Name = %q", infos[2].Name)
	}
}
