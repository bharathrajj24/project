/**
 * Natural Language Processing and text similarity utilities for municipal complaints
 */

// Common English stopwords plus generic municipal filler words
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against',
  'of', 'from', 'this', 'that', 'these', 'those', 'there', 'here',
  'please', 'city', 'issue', 'problem', 'report', 'reported', 'there',
  'complaint', 'very', 'urgent', 'help', 'need', 'fixed', 'attention'
]);

// Municipal domain synonyms for robust fuzzy matching
const SYNONYM_MAP: Record<string, string> = {
  'pothole': 'pothole',
  'crater': 'pothole',
  'cavity': 'pothole',
  'depression': 'pothole',
  'sinkhole': 'pothole',
  'rut': 'pothole',
  'asphalt': 'road',
  'pavement': 'road',
  'street': 'road',
  'avenue': 'road',
  'boulevard': 'road',
  'lane': 'road',
  'drain': 'drainage',
  'drainage': 'drainage',
  'stormwater': 'drainage',
  'gutter': 'drainage',
  'sewer': 'drainage',
  'catchbasin': 'drainage',
  'culvert': 'drainage',
  'flood': 'drainage',
  'flooding': 'drainage',
  'overflow': 'drainage',
  'streetlight': 'streetlight',
  'lamp': 'streetlight',
  'luminaire': 'streetlight',
  'lighting': 'streetlight',
  'bulb': 'streetlight',
  'blackout': 'dark',
  'dark': 'dark',
  'trash': 'sanitation',
  'garbage': 'sanitation',
  'refuse': 'sanitation',
  'waste': 'sanitation',
  'debris': 'sanitation',
  'litter': 'sanitation',
  'permit': 'permit',
  'zoning': 'permit',
  'construction': 'permit',
  'encroachment': 'permit',
  'setback': 'permit',
  'inspection': 'permit'
};

/**
 * Normalizes text: lowercase, punctuation removed, trimmed
 */
export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes string and filters stopwords
 */
export function extractTokens(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  
  return normalized
    .split(' ')
    .filter(token => token.length > 2 && !STOPWORDS.has(token))
    .map(token => SYNONYM_MAP[token] || token);
}

/**
 * Computes Jaccard Similarity between two token sets
 */
export function computeJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;
  
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  
  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }
  
  const unionCount = setA.size + setB.size - intersectionCount;
  if (unionCount === 0) return 0.0;
  
  return Number((intersectionCount / unionCount).toFixed(3));
}

/**
 * Character 3-gram extraction for typo & spelling mistake tolerance
 */
export function extractCharNGrams(text: string, n = 3): Set<string> {
  const clean = normalizeText(text).replace(/\s/g, '_');
  const ngrams = new Set<string>();
  if (clean.length < n) {
    ngrams.add(clean);
    return ngrams;
  }
  for (let i = 0; i <= clean.length - n; i++) {
    ngrams.add(clean.substring(i, i + n));
  }
  return ngrams;
}

/**
 * Computes N-Gram Dice/Cosine similarity (robust against spelling mistakes like "pot hole" vs "pothole")
 */
export function computeNGramSimilarity(textA: string, textB: string): number {
  const ngramsA = extractCharNGrams(textA);
  const ngramsB = extractCharNGrams(textB);
  
  if (ngramsA.size === 0 || ngramsB.size === 0) return 0;
  
  let matchCount = 0;
  for (const gram of ngramsA) {
    if (ngramsB.has(gram)) {
      matchCount++;
    }
  }
  
  const similarity = (2 * matchCount) / (ngramsA.size + ngramsB.size);
  return Number(similarity.toFixed(3));
}

/**
 * Fast Levenshtein distance normalized to 0.0 - 1.0 similarity
 */
export function computeNormalizedLevenshtein(s1: string, s2: string): number {
  const str1 = normalizeText(s1).substring(0, 100);
  const str2 = normalizeText(s2).substring(0, 100);
  
  const m = str1.length;
  const n = str2.length;
  if (m === 0) return n === 0 ? 1 : 0;
  if (n === 0) return 0;
  
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = dp[m][n];
  const maxLen = Math.max(m, n);
  const similarity = 1 - distance / maxLen;
  return Number(Math.max(0, similarity).toFixed(3));
}

/**
 * Composite NLP text similarity combining token Jaccard and char n-grams
 */
export function computeTextSimilarity(textA: string, textB: string): {
  score: number;
  sharedTokens: string[];
} {
  const tokensA = extractTokens(textA);
  const tokensB = extractTokens(textB);
  
  const jaccard = computeJaccardSimilarity(tokensA, tokensB);
  const ngram = computeNGramSimilarity(textA, textB);
  
  // Identify shared tokens for explainability
  const setB = new Set(tokensB);
  const sharedTokens = tokensA.filter(t => setB.has(t));
  
  // Weighted blend: 60% token semantic overlap + 40% character n-gram robustness
  const composite = 0.6 * jaccard + 0.4 * ngram;
  return {
    score: Number(composite.toFixed(3)),
    sharedTokens: Array.from(new Set(sharedTokens)),
  };
}
