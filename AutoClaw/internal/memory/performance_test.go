package memory

import (
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestPerformanceLayer_RecordAndGetContext(t *testing.T) {
	path := filepath.Join(t.TempDir(), "perf", "metrics.json")
	layer, err := NewPerformanceLayer(path)
	if err != nil {
		t.Fatal(err)
	}

	layer.RecordSuccess("web_search")
	layer.RecordSuccess("web_search")
	layer.RecordFailure("web_search")

	ctx := layer.GetContext(0)
	if !strings.Contains(ctx, "web_search") {
		t.Error("expected web_search in context")
	}
	if !strings.Contains(ctx, "3 calls") {
		t.Error("expected 3 calls")
	}
	if !strings.Contains(ctx, "67%") {
		t.Error("expected 67% success rate")
	}
}

func TestPerformanceLayer_SaveAndLoad(t *testing.T) {
	path := filepath.Join(t.TempDir(), "perf", "metrics.json")
	layer, _ := NewPerformanceLayer(path)

	layer.RecordSuccess("exec")
	layer.RecordSuccess("exec")
	layer.RecordFailure("write_file")

	if err := layer.Save(); err != nil {
		t.Fatal(err)
	}

	// Reload.
	layer2, err := NewPerformanceLayer(path)
	if err != nil {
		t.Fatal(err)
	}
	metrics := layer2.GetMetrics()
	if len(metrics) != 2 {
		t.Fatalf("got %d metrics, want 2", len(metrics))
	}
}

func TestPerformanceLayer_EmptyGetContext(t *testing.T) {
	path := filepath.Join(t.TempDir(), "perf", "metrics.json")
	layer, _ := NewPerformanceLayer(path)

	ctx := layer.GetContext(0)
	if ctx != "" {
		t.Errorf("expected empty context, got %q", ctx)
	}
}

func TestPerformanceLayer_IsReadOnly(t *testing.T) {
	path := filepath.Join(t.TempDir(), "perf", "metrics.json")
	layer, _ := NewPerformanceLayer(path)

	if !layer.IsReadOnly() {
		t.Error("expected read-only")
	}
}

func TestPerformanceLayer_AvgSuccessRate(t *testing.T) {
	path := filepath.Join(t.TempDir(), "perf", "metrics.json")
	layer, _ := NewPerformanceLayer(path)

	// 100% success on one tool, 50% on another → avg = 75%
	layer.RecordSuccess("tool-a")
	layer.RecordSuccess("tool-b")
	layer.RecordFailure("tool-b")

	rate := layer.AvgSuccessRate()
	if rate < 0.74 || rate > 0.76 {
		t.Errorf("AvgSuccessRate = %.2f, want ~0.75", rate)
	}
}

func TestPerformanceLayer_ConcurrentRecord(t *testing.T) {
	path := filepath.Join(t.TempDir(), "perf", "metrics.json")
	layer, _ := NewPerformanceLayer(path)

	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			layer.RecordSuccess("concurrent-tool")
		}()
	}
	wg.Wait()

	metrics := layer.GetMetrics()
	if len(metrics) != 1 {
		t.Fatalf("expected 1 metric, got %d", len(metrics))
	}
	if metrics[0].Successes != 100 {
		t.Errorf("Successes = %d, want 100", metrics[0].Successes)
	}
}
