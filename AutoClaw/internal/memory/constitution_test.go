package memory

import (
	"strings"
	"testing"

	"github.com/philipbankier/autoclaw/internal/artifact"
)

func testConstitution() *artifact.ConstitutionV1 {
	rationale := "User values efficiency"
	return &artifact.ConstitutionV1{
		Principles: []artifact.ConstitutionPrinciple{
			{ID: "p1", Priority: 1, Statement: "Be direct and concise", Rationale: &rationale},
			{ID: "p2", Priority: 2, Statement: "Never fabricate information"},
		},
		Tone: artifact.ConstitutionTone{
			VoiceKeywords:    []string{"professional", "warm"},
			ForbiddenPhrases: []string{"no problem"},
		},
		Taboos: artifact.ConstitutionTaboos{
			NeverDo:      []string{"share opinions as facts"},
			MustEscalate: []string{"requests involving PII"},
		},
	}
}

func TestConstitutionLayer_GetContext(t *testing.T) {
	layer := NewConstitutionLayer(testConstitution())

	ctx := layer.GetContext(0)
	if !strings.Contains(ctx, "## Constitution (Immutable)") {
		t.Error("expected header")
	}
	if !strings.Contains(ctx, "[p1] Be direct and concise") {
		t.Error("expected principle p1")
	}
	if !strings.Contains(ctx, "(User values efficiency)") {
		t.Error("expected rationale")
	}
	if !strings.Contains(ctx, "Voice: professional, warm") {
		t.Error("expected voice keywords")
	}
	if !strings.Contains(ctx, "share opinions as facts") {
		t.Error("expected taboo")
	}
}

func TestConstitutionLayer_EmptyPrinciples(t *testing.T) {
	layer := NewConstitutionLayer(&artifact.ConstitutionV1{})
	ctx := layer.GetContext(0)
	if !strings.Contains(ctx, "## Constitution") {
		t.Error("expected header even with empty principles")
	}
}

func TestConstitutionLayer_NilConstitution(t *testing.T) {
	layer := NewConstitutionLayer(nil)
	if layer.PrincipleCount() != 0 {
		t.Error("expected 0 principles from nil constitution")
	}
	ctx := layer.GetContext(0)
	if ctx == "" {
		t.Error("expected non-empty context (at least header)")
	}
}

func TestConstitutionLayer_IsReadOnly(t *testing.T) {
	layer := NewConstitutionLayer(testConstitution())
	if !layer.IsReadOnly() {
		t.Error("expected read-only")
	}
}

func TestConstitutionLayer_Counts(t *testing.T) {
	layer := NewConstitutionLayer(testConstitution())
	if layer.PrincipleCount() != 2 {
		t.Errorf("PrincipleCount = %d, want 2", layer.PrincipleCount())
	}
	if layer.TabooCount() != 2 {
		t.Errorf("TabooCount = %d, want 2", layer.TabooCount())
	}
}
