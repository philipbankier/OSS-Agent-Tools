package memory

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// PerformanceLayer tracks tool and skill success/failure metrics.
// Read-only from the agent's prompt perspective; written by the tool execution hook.
type PerformanceLayer struct {
	path string
	data PerformanceData
	mu   sync.RWMutex
}

// NewPerformanceLayer loads or initializes a performance metrics layer.
func NewPerformanceLayer(path string) (*PerformanceLayer, error) {
	os.MkdirAll(filepath.Dir(path), 0o755)

	l := &PerformanceLayer{path: path}
	data, err := os.ReadFile(path)
	if err == nil {
		json.Unmarshal(data, &l.data)
	}
	return l, nil
}

func (l *PerformanceLayer) Name() string     { return "performance" }
func (l *PerformanceLayer) IsReadOnly() bool  { return true }

// RecordSuccess increments the success count for a tool or skill.
func (l *PerformanceLayer) RecordSuccess(toolOrSkill string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	m := l.findOrCreate(toolOrSkill)
	m.Successes++
	m.LastUsed = time.Now().UTC().Format(time.RFC3339)
	l.data.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
}

// RecordFailure increments the failure count for a tool or skill.
func (l *PerformanceLayer) RecordFailure(toolOrSkill string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	m := l.findOrCreate(toolOrSkill)
	m.Failures++
	m.LastUsed = time.Now().UTC().Format(time.RFC3339)
	l.data.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
}

// Save persists the performance data to disk.
func (l *PerformanceLayer) Save() error {
	l.mu.RLock()
	defer l.mu.RUnlock()

	data, err := json.MarshalIndent(l.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(l.path, data, 0o644)
}

// GetContext returns a compact summary of performance metrics for the system prompt.
func (l *PerformanceLayer) GetContext(maxChars int) string {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if len(l.data.Metrics) == 0 {
		return ""
	}

	var b strings.Builder
	b.WriteString("## Performance Metrics\n\n")

	for _, m := range l.data.Metrics {
		total := m.Successes + m.Failures
		var rate float64
		if total > 0 {
			rate = float64(m.Successes) / float64(total) * 100
		}
		line := fmt.Sprintf("- %s: %d calls, %.0f%% success\n", m.ToolOrSkill, total, rate)
		if maxChars > 0 && b.Len()+len(line) > maxChars {
			break
		}
		b.WriteString(line)
	}
	return b.String()
}

// GetMetrics returns a copy of all metrics.
func (l *PerformanceLayer) GetMetrics() []PerformanceMetric {
	l.mu.RLock()
	defer l.mu.RUnlock()

	out := make([]PerformanceMetric, len(l.data.Metrics))
	copy(out, l.data.Metrics)
	return out
}

// AvgSuccessRate returns the average success rate across all tracked tools.
func (l *PerformanceLayer) AvgSuccessRate() float64 {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if len(l.data.Metrics) == 0 {
		return 0
	}

	var totalRate float64
	var count int
	for _, m := range l.data.Metrics {
		total := m.Successes + m.Failures
		if total > 0 {
			totalRate += float64(m.Successes) / float64(total)
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return totalRate / float64(count)
}

func (l *PerformanceLayer) findOrCreate(toolOrSkill string) *PerformanceMetric {
	for i := range l.data.Metrics {
		if l.data.Metrics[i].ToolOrSkill == toolOrSkill {
			return &l.data.Metrics[i]
		}
	}
	l.data.Metrics = append(l.data.Metrics, PerformanceMetric{ToolOrSkill: toolOrSkill})
	return &l.data.Metrics[len(l.data.Metrics)-1]
}
