package drift

import "strings"

// Tokenize splits text into lowercase words, filtering out words <= 2 characters.
// Matches TasteKit's tokenizer.
func Tokenize(text string) []string {
	words := strings.Fields(strings.ToLower(text))
	var filtered []string
	for _, w := range words {
		if len(w) > 2 {
			filtered = append(filtered, w)
		}
	}
	return filtered
}

// JaccardSimilarity computes word-level Jaccard similarity between two texts.
// Returns a value between 0.0 (no overlap) and 1.0 (identical word sets).
func JaccardSimilarity(a, b string) float64 {
	wordsA := toSet(Tokenize(a))
	wordsB := toSet(Tokenize(b))

	if len(wordsA) == 0 && len(wordsB) == 0 {
		return 0.0
	}

	intersection := 0
	for w := range wordsA {
		if wordsB[w] {
			intersection++
		}
	}

	union := len(wordsA) + len(wordsB) - intersection
	if union == 0 {
		return 0.0
	}
	return float64(intersection) / float64(union)
}

// ExtractUniqueContent returns words in secondary that are NOT in primary.
// Used during memory merging to append only new information.
func ExtractUniqueContent(secondary, primary string) string {
	primaryWords := toSet(Tokenize(primary))
	secondaryWords := Tokenize(secondary)

	var unique []string
	seen := make(map[string]bool)
	for _, w := range secondaryWords {
		if !primaryWords[w] && !seen[w] {
			unique = append(unique, w)
			seen[w] = true
		}
	}
	return strings.Join(unique, " ")
}

func toSet(words []string) map[string]bool {
	s := make(map[string]bool, len(words))
	for _, w := range words {
		s[w] = true
	}
	return s
}
