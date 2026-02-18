package artifact

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// Workspace holds all loaded TasteKit artifacts.
type Workspace struct {
	Dir          string
	Constitution *ConstitutionV1
	Guardrails   *GuardrailsV1
	Memory       *MemoryV1
	Bindings     *BindingsV1
	Trust        *TrustV1
	Skills       *SkillsManifestV1
	Playbooks    []*PlaybookV1
	EvalPacks    []*EvalPackV1
	Traces       []TraceEvent
}

// LoadWorkspace reads all TasteKit artifacts from a .tastekit directory.
// Missing optional files are silently skipped; only constitution is required.
func LoadWorkspace(tastekitDir string) (*Workspace, error) {
	artDir := filepath.Join(tastekitDir, "artifacts")
	ws := &Workspace{Dir: tastekitDir}

	// Constitution is required (JSON).
	c, err := LoadConstitution(filepath.Join(artDir, "constitution.v1.json"))
	if err != nil {
		return nil, fmt.Errorf("constitution: %w", err)
	}
	ws.Constitution = c

	// Optional YAML artifacts.
	if g, err := LoadGuardrails(filepath.Join(artDir, "guardrails.v1.yaml")); err == nil {
		ws.Guardrails = g
	} else if !os.IsNotExist(err) {
		return nil, fmt.Errorf("guardrails: %w", err)
	}

	if m, err := LoadMemory(filepath.Join(artDir, "memory.v1.yaml")); err == nil {
		ws.Memory = m
	} else if !os.IsNotExist(err) {
		return nil, fmt.Errorf("memory: %w", err)
	}

	if b, err := LoadBindings(filepath.Join(artDir, "bindings.v1.yaml")); err == nil {
		ws.Bindings = b
	} else if !os.IsNotExist(err) {
		return nil, fmt.Errorf("bindings: %w", err)
	}

	if t, err := LoadTrust(filepath.Join(artDir, "trust.v1.yaml")); err == nil {
		ws.Trust = t
	} else if !os.IsNotExist(err) {
		return nil, fmt.Errorf("trust: %w", err)
	}

	if s, err := LoadSkillsManifest(filepath.Join(artDir, "skills", "manifest.v1.yaml")); err == nil {
		ws.Skills = s
	} else if !os.IsNotExist(err) {
		return nil, fmt.Errorf("skills manifest: %w", err)
	}

	// Playbooks: load all .yaml files in playbooks/.
	playbooksDir := filepath.Join(artDir, "playbooks")
	if entries, err := os.ReadDir(playbooksDir); err == nil {
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".yaml") {
				continue
			}
			p, err := LoadPlaybook(filepath.Join(playbooksDir, e.Name()))
			if err != nil {
				return nil, fmt.Errorf("playbook %s: %w", e.Name(), err)
			}
			ws.Playbooks = append(ws.Playbooks, p)
		}
	}

	// EvalPacks: load all .yaml files in evals/.
	evalsDir := filepath.Join(artDir, "evals")
	if entries, err := os.ReadDir(evalsDir); err == nil {
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".yaml") {
				continue
			}
			ep, err := LoadEvalPack(filepath.Join(evalsDir, e.Name()))
			if err != nil {
				return nil, fmt.Errorf("evalpack %s: %w", e.Name(), err)
			}
			ws.EvalPacks = append(ws.EvalPacks, ep)
		}
	}

	// Traces: load all .jsonl files in traces/.
	tracesDir := filepath.Join(tastekitDir, "traces")
	if entries, err := os.ReadDir(tracesDir); err == nil {
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".jsonl") {
				continue
			}
			events, err := LoadTraces(filepath.Join(tracesDir, e.Name()))
			if err != nil {
				return nil, fmt.Errorf("traces %s: %w", e.Name(), err)
			}
			ws.Traces = append(ws.Traces, events...)
		}
	}

	return ws, nil
}

// --- Per-artifact loaders ---

// LoadConstitution loads a constitution artifact from JSON.
func LoadConstitution(path string) (*ConstitutionV1, error) {
	var c ConstitutionV1
	if err := loadJSON(path, &c); err != nil {
		return nil, err
	}
	if err := validateConstitution(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

// LoadGuardrails loads a guardrails artifact from YAML.
func LoadGuardrails(path string) (*GuardrailsV1, error) {
	var g GuardrailsV1
	if err := loadYAML(path, &g); err != nil {
		return nil, err
	}
	if err := validateGuardrails(&g); err != nil {
		return nil, err
	}
	return &g, nil
}

// LoadMemory loads a memory artifact from YAML.
func LoadMemory(path string) (*MemoryV1, error) {
	var m MemoryV1
	if err := loadYAML(path, &m); err != nil {
		return nil, err
	}
	if err := validateMemory(&m); err != nil {
		return nil, err
	}
	return &m, nil
}

// LoadBindings loads a bindings artifact from YAML.
func LoadBindings(path string) (*BindingsV1, error) {
	var b BindingsV1
	if err := loadYAML(path, &b); err != nil {
		return nil, err
	}
	if err := validateBindings(&b); err != nil {
		return nil, err
	}
	return &b, nil
}

// LoadTrust loads a trust artifact from YAML.
func LoadTrust(path string) (*TrustV1, error) {
	var t TrustV1
	if err := loadYAML(path, &t); err != nil {
		return nil, err
	}
	if err := validateTrust(&t); err != nil {
		return nil, err
	}
	return &t, nil
}

// LoadSkillsManifest loads a skills manifest artifact from YAML.
func LoadSkillsManifest(path string) (*SkillsManifestV1, error) {
	var s SkillsManifestV1
	if err := loadYAML(path, &s); err != nil {
		return nil, err
	}
	if err := validateSkillsManifest(&s); err != nil {
		return nil, err
	}
	return &s, nil
}

// LoadPlaybook loads a playbook artifact from YAML.
func LoadPlaybook(path string) (*PlaybookV1, error) {
	var p PlaybookV1
	if err := loadYAML(path, &p); err != nil {
		return nil, err
	}
	if err := validatePlaybook(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

// LoadEvalPack loads an eval pack artifact from YAML.
func LoadEvalPack(path string) (*EvalPackV1, error) {
	var ep EvalPackV1
	if err := loadYAML(path, &ep); err != nil {
		return nil, err
	}
	if err := validateEvalPack(&ep); err != nil {
		return nil, err
	}
	return &ep, nil
}

// LoadTraces loads trace events from a JSONL file.
func LoadTraces(path string) ([]TraceEvent, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var events []TraceEvent
	scanner := bufio.NewScanner(f)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var ev TraceEvent
		if err := json.Unmarshal([]byte(line), &ev); err != nil {
			return nil, fmt.Errorf("line %d: %w", lineNum, err)
		}
		events = append(events, ev)
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return events, nil
}

// --- File helpers ---

func loadJSON(path string, v any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

func loadYAML(path string, v any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return yaml.Unmarshal(data, v)
}
