package drift

import (
	"math"
	"testing"
	"time"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

func strPtr(s string) *string { return &s }

// --- Similarity Tests ---

func TestTokenize(t *testing.T) {
	tokens := Tokenize("The quick brown fox jumps over the lazy dog")
	// "the" (len 3) should be included, but single/double char words filtered.
	for _, tok := range tokens {
		if len(tok) <= 2 {
			t.Errorf("token %q should have been filtered (len <= 2)", tok)
		}
	}
	// "the" appears twice, all 9 words have len > 2.
	if len(tokens) != 9 {
		t.Errorf("expected 9 tokens, got %d: %v", len(tokens), tokens)
	}
}

func TestTokenize_ShortWords(t *testing.T) {
	tokens := Tokenize("I am a go AI")
	// All words are <= 2 chars.
	if len(tokens) != 0 {
		t.Errorf("expected 0 tokens for short words, got %d: %v", len(tokens), tokens)
	}
}

func TestJaccardSimilarity_Identical(t *testing.T) {
	sim := JaccardSimilarity("the quick brown fox", "the quick brown fox")
	if sim != 1.0 {
		t.Errorf("identical texts should have similarity 1.0, got %f", sim)
	}
}

func TestJaccardSimilarity_NoOverlap(t *testing.T) {
	sim := JaccardSimilarity("the quick brown fox", "jumped over lazy dogs")
	if sim != 0.0 {
		t.Errorf("no overlap should have similarity 0.0, got %f", sim)
	}
}

func TestJaccardSimilarity_Partial(t *testing.T) {
	sim := JaccardSimilarity("the quick brown fox jumps", "the quick red fox runs")
	// Common: {the, quick, fox} = 3, Union: {the, quick, brown, fox, jumps, red, runs} = 7
	expected := 3.0 / 7.0
	if math.Abs(sim-expected) > 0.01 {
		t.Errorf("partial similarity = %f, want ~%f", sim, expected)
	}
}

func TestJaccardSimilarity_Empty(t *testing.T) {
	sim := JaccardSimilarity("", "")
	if sim != 0.0 {
		t.Errorf("empty texts should have similarity 0.0, got %f", sim)
	}
}

func TestExtractUniqueContent(t *testing.T) {
	primary := "the quick brown fox jumps"
	secondary := "the slow brown cat sleeps"
	unique := ExtractUniqueContent(secondary, primary)
	if unique != "slow cat sleeps" {
		t.Errorf("unique = %q, want %q", unique, "slow cat sleeps")
	}
}

func TestExtractUniqueContent_NoUnique(t *testing.T) {
	unique := ExtractUniqueContent("the quick brown", "the quick brown fox jumps")
	if unique != "" {
		t.Errorf("expected empty unique content, got %q", unique)
	}
}

// --- Detector Tests ---

func makeEvents(n int, eventType string, data map[string]any) []artifact.TraceEvent {
	events := make([]artifact.TraceEvent, n)
	for i := range events {
		events[i] = artifact.TraceEvent{
			SchemaVersion: "trace_event.v1",
			RunID:         "test-run",
			Timestamp:     time.Now().UTC().Format(time.RFC3339),
			Actor:         "user",
			EventType:     eventType,
			Data:          data,
		}
	}
	return events
}

func TestDetector_NoEvents(t *testing.T) {
	d := NewDetector()
	proposals := d.DetectFromTraces(nil, DetectionOptions{})
	if len(proposals) != 0 {
		t.Errorf("no events should produce no proposals, got %d", len(proposals))
	}
}

func TestDetector_BelowThreshold(t *testing.T) {
	d := NewDetector()
	// 2 rejections (below threshold of 3).
	events := makeEvents(2, "approval_response", map[string]any{"approved": false, "reason": "too formal"})
	proposals := d.DetectFromTraces(events, DetectionOptions{})
	if len(proposals) != 0 {
		t.Errorf("below threshold should produce no proposals, got %d", len(proposals))
	}
}

func TestDetector_RepeatedEdits(t *testing.T) {
	d := NewDetector()
	events := makeEvents(5, "approval_response", map[string]any{"approved": false, "reason": "too formal"})
	proposals := d.DetectFromTraces(events, DetectionOptions{})
	if len(proposals) != 1 {
		t.Fatalf("expected 1 proposal, got %d", len(proposals))
	}
	if proposals[0].SignalType != "repeated_edit" {
		t.Errorf("signal_type = %q, want %q", proposals[0].SignalType, "repeated_edit")
	}
	if proposals[0].Frequency != 5 {
		t.Errorf("frequency = %d, want 5", proposals[0].Frequency)
	}
	if proposals[0].RiskRating != "low" {
		t.Errorf("risk_rating = %q, want %q", proposals[0].RiskRating, "low")
	}
}

func TestDetector_HighRisk(t *testing.T) {
	d := NewDetector()
	events := makeEvents(15, "approval_response", map[string]any{"approved": false, "reason": "wrong tone"})
	proposals := d.DetectFromTraces(events, DetectionOptions{})
	if len(proposals) != 1 {
		t.Fatalf("expected 1 proposal, got %d", len(proposals))
	}
	if proposals[0].RiskRating != "high" {
		t.Errorf("risk_rating = %q, want %q (frequency=%d)", proposals[0].RiskRating, "high", proposals[0].Frequency)
	}
}

func TestDetector_MediumRisk(t *testing.T) {
	d := NewDetector()
	events := makeEvents(7, "approval_response", map[string]any{"approved": false, "reason": "test"})
	proposals := d.DetectFromTraces(events, DetectionOptions{})
	if len(proposals) != 1 {
		t.Fatalf("expected 1 proposal, got %d", len(proposals))
	}
	if proposals[0].RiskRating != "medium" {
		t.Errorf("risk_rating = %q, want %q", proposals[0].RiskRating, "medium")
	}
}

func TestDetector_PrincipleViolations(t *testing.T) {
	d := NewDetector()
	var events []artifact.TraceEvent
	for i := 0; i < 4; i++ {
		errMsg := "rate limit exceeded"
		events = append(events, artifact.TraceEvent{
			SchemaVersion: "trace_event.v1",
			RunID:         "test-run",
			Timestamp:     time.Now().UTC().Format(time.RFC3339),
			Actor:         "system",
			EventType:     "error",
			Error:         &errMsg,
		})
	}
	proposals := d.DetectFromTraces(events, DetectionOptions{})
	found := false
	for _, p := range proposals {
		if p.SignalType == "principle_violation" {
			found = true
			if p.Frequency != 4 {
				t.Errorf("frequency = %d, want 4", p.Frequency)
			}
		}
	}
	if !found {
		t.Error("expected principle_violation proposal")
	}
}

func TestDetector_MultipleSignalTypes(t *testing.T) {
	d := NewDetector()
	// 3 rejections + 3 errors.
	rejections := makeEvents(3, "approval_response", map[string]any{"approved": false, "reason": "wrong"})
	errMsg := "error"
	var errors []artifact.TraceEvent
	for i := 0; i < 3; i++ {
		errors = append(errors, artifact.TraceEvent{
			SchemaVersion: "trace_event.v1",
			RunID:         "test",
			Timestamp:     time.Now().UTC().Format(time.RFC3339),
			Actor:         "system",
			EventType:     "error",
			Error:         &errMsg,
		})
	}

	all := append(rejections, errors...)
	proposals := d.DetectFromTraces(all, DetectionOptions{})
	if len(proposals) != 2 {
		t.Errorf("expected 2 proposals (repeated_edit + principle_violation), got %d", len(proposals))
	}
}

func TestDetector_FilterBySince(t *testing.T) {
	d := NewDetector()
	old := time.Now().Add(-48 * time.Hour)
	recent := time.Now().Add(-1 * time.Hour)
	cutoff := time.Now().Add(-24 * time.Hour)

	var events []artifact.TraceEvent
	// 3 old rejections.
	for i := 0; i < 3; i++ {
		events = append(events, artifact.TraceEvent{
			SchemaVersion: "trace_event.v1",
			RunID:         "test",
			Timestamp:     old.Format(time.RFC3339),
			Actor:         "user",
			EventType:     "approval_response",
			Data:          map[string]any{"approved": false, "reason": "old"},
		})
	}
	// 2 recent rejections (below threshold).
	for i := 0; i < 2; i++ {
		events = append(events, artifact.TraceEvent{
			SchemaVersion: "trace_event.v1",
			RunID:         "test",
			Timestamp:     recent.Format(time.RFC3339),
			Actor:         "user",
			EventType:     "approval_response",
			Data:          map[string]any{"approved": false, "reason": "new"},
		})
	}

	proposals := d.DetectFromTraces(events, DetectionOptions{Since: &cutoff})
	// Only 2 recent rejections, below threshold of 3.
	if len(proposals) != 0 {
		t.Errorf("expected 0 proposals after time filter, got %d", len(proposals))
	}
}

func TestDetector_FilterBySkill(t *testing.T) {
	d := NewDetector()
	skillA := "skill-a"
	skillB := "skill-b"

	var events []artifact.TraceEvent
	for i := 0; i < 3; i++ {
		events = append(events, artifact.TraceEvent{
			SchemaVersion: "trace_event.v1",
			RunID:         "test",
			Timestamp:     time.Now().UTC().Format(time.RFC3339),
			Actor:         "user",
			EventType:     "approval_response",
			SkillID:       &skillA,
			Data:          map[string]any{"approved": false, "reason": "test"},
		})
	}
	for i := 0; i < 5; i++ {
		events = append(events, artifact.TraceEvent{
			SchemaVersion: "trace_event.v1",
			RunID:         "test",
			Timestamp:     time.Now().UTC().Format(time.RFC3339),
			Actor:         "user",
			EventType:     "approval_response",
			SkillID:       &skillB,
			Data:          map[string]any{"approved": false, "reason": "test"},
		})
	}

	proposals := d.DetectFromTraces(events, DetectionOptions{SkillID: "skill-a"})
	if len(proposals) != 1 {
		t.Fatalf("expected 1 proposal for skill-a, got %d", len(proposals))
	}
	if proposals[0].Frequency != 3 {
		t.Errorf("frequency = %d, want 3 (only skill-a events)", proposals[0].Frequency)
	}
}

func TestDetector_ApprovedEventsIgnored(t *testing.T) {
	d := NewDetector()
	events := makeEvents(10, "approval_response", map[string]any{"approved": true})
	proposals := d.DetectFromTraces(events, DetectionOptions{})
	if len(proposals) != 0 {
		t.Errorf("approved events should not generate proposals, got %d", len(proposals))
	}
}

// --- Consolidator Tests ---

func TestConsolidator_RetentionByAge(t *testing.T) {
	c := NewConsolidator()
	recent := time.Now().Add(-1 * time.Hour).Format(time.RFC3339)
	old := time.Now().Add(-100 * 24 * time.Hour).Format(time.RFC3339)

	memories := []MemoryEntry{
		{ID: "recent", Content: "something recent and unique alpha", Salience: 0.3, Timestamp: recent},
		{ID: "old", Content: "something old and different beta", Salience: 0.3, Timestamp: old},
	}

	plan := c.GenerateConsolidationPlan(memories, 30)
	if len(plan.MemoriesToPrune) != 1 || plan.MemoriesToPrune[0] != "old" {
		t.Errorf("expected old memory pruned, got prune=%v", plan.MemoriesToPrune)
	}
	if len(plan.MemoriesToKeep) != 1 || plan.MemoriesToKeep[0] != "recent" {
		t.Errorf("expected recent memory kept, got keep=%v", plan.MemoriesToKeep)
	}
}

func TestConsolidator_HighSalienceKept(t *testing.T) {
	c := NewConsolidator()
	old := time.Now().Add(-100 * 24 * time.Hour).Format(time.RFC3339)

	memories := []MemoryEntry{
		{ID: "important", Content: "critical user preference about formatting", Salience: 0.9, Timestamp: old},
		{ID: "trivial", Content: "minor detail about yesterday weather forecast", Salience: 0.2, Timestamp: old},
	}

	plan := c.GenerateConsolidationPlan(memories, 30)
	if len(plan.MemoriesToPrune) != 1 || plan.MemoriesToPrune[0] != "trivial" {
		t.Errorf("expected trivial memory pruned, got prune=%v", plan.MemoriesToPrune)
	}
	if len(plan.MemoriesToKeep) != 1 || plan.MemoriesToKeep[0] != "important" {
		t.Errorf("expected high-salience memory kept, got keep=%v", plan.MemoriesToKeep)
	}
}

func TestConsolidator_MergeSimilar(t *testing.T) {
	c := NewConsolidator()
	now := time.Now().Format(time.RFC3339)

	memories := []MemoryEntry{
		{ID: "m1", Content: "user prefers direct professional communication style", Salience: 0.8, Timestamp: now},
		{ID: "m2", Content: "user prefers direct professional tone and style", Salience: 0.5, Timestamp: now},
	}

	plan := c.GenerateConsolidationPlan(memories, 30)
	if len(plan.MemoriesToMerge) != 1 {
		t.Fatalf("expected 1 merge group, got %d", len(plan.MemoriesToMerge))
	}
	mg := plan.MemoriesToMerge[0]
	if len(mg.SourceIDs) != 2 {
		t.Errorf("merge group should have 2 sources, got %d", len(mg.SourceIDs))
	}
	// Primary should be m1 (higher salience).
	if mg.SourceIDs[0] != "m1" {
		t.Errorf("primary should be m1 (higher salience), got %q", mg.SourceIDs[0])
	}
}

func TestConsolidator_NoMergeForDissimilar(t *testing.T) {
	c := NewConsolidator()
	now := time.Now().Format(time.RFC3339)

	memories := []MemoryEntry{
		{ID: "m1", Content: "user loves pizza and italian food", Salience: 0.5, Timestamp: now},
		{ID: "m2", Content: "agent should always cite sources properly", Salience: 0.5, Timestamp: now},
	}

	plan := c.GenerateConsolidationPlan(memories, 30)
	if len(plan.MemoriesToMerge) != 0 {
		t.Errorf("dissimilar memories should not merge, got %d groups", len(plan.MemoriesToMerge))
	}
	if len(plan.MemoriesToKeep) != 2 {
		t.Errorf("both memories should be kept, got %d", len(plan.MemoriesToKeep))
	}
}

func TestConsolidator_EmptyMemories(t *testing.T) {
	c := NewConsolidator()
	plan := c.GenerateConsolidationPlan(nil, 30)
	if len(plan.MemoriesToKeep) != 0 && len(plan.MemoriesToPrune) != 0 && len(plan.MemoriesToMerge) != 0 {
		t.Error("empty input should produce empty plan")
	}
}

// --- Proposal Store Tests ---

func TestProposalStore_SaveAndLoad(t *testing.T) {
	dir := t.TempDir()
	store, err := NewProposalStore(dir)
	if err != nil {
		t.Fatal(err)
	}

	p := DriftProposal{
		ProposalID: "test-proposal-1",
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
		SignalType: "repeated_edit",
		Frequency:  5,
		Rationale:  "Test rationale",
		RiskRating: "low",
		Status:     "pending",
	}

	if err := store.Save(p); err != nil {
		t.Fatal(err)
	}

	loaded, err := store.Load("test-proposal-1")
	if err != nil {
		t.Fatal(err)
	}
	if loaded.SignalType != "repeated_edit" {
		t.Errorf("signal_type = %q, want %q", loaded.SignalType, "repeated_edit")
	}
}

func TestProposalStore_ListPending(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewProposalStore(dir)

	store.Save(DriftProposal{ProposalID: "p1", Status: "pending"})
	store.Save(DriftProposal{ProposalID: "p2", Status: "accepted"})
	store.Save(DriftProposal{ProposalID: "p3", Status: "pending"})

	pending, err := store.ListPending()
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) != 2 {
		t.Errorf("expected 2 pending, got %d", len(pending))
	}
}

func TestProposalStore_AcceptReject(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewProposalStore(dir)

	store.Save(DriftProposal{ProposalID: "p1", Status: "pending"})
	store.Save(DriftProposal{ProposalID: "p2", Status: "pending"})

	if err := store.Accept("p1"); err != nil {
		t.Fatal(err)
	}
	if err := store.Reject("p2"); err != nil {
		t.Fatal(err)
	}

	p1, _ := store.Load("p1")
	if p1.Status != "accepted" {
		t.Errorf("p1 status = %q, want %q", p1.Status, "accepted")
	}
	p2, _ := store.Load("p2")
	if p2.Status != "rejected" {
		t.Errorf("p2 status = %q, want %q", p2.Status, "rejected")
	}

	// No pending proposals left.
	pending, _ := store.ListPending()
	if len(pending) != 0 {
		t.Errorf("expected 0 pending after accept/reject, got %d", len(pending))
	}
}

func TestProposalStore_DefaultStatus(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewProposalStore(dir)

	// Save without explicit status.
	store.Save(DriftProposal{ProposalID: "auto"})

	loaded, _ := store.Load("auto")
	if loaded.Status != "pending" {
		t.Errorf("default status = %q, want %q", loaded.Status, "pending")
	}
}
