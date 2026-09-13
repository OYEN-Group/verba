import { ClaimScope } from '../../citations/scope';
import { EvidencePassage } from '../../citations/evidence';

/**
 * Splits document text into overlapping chunks and scores them against the claim.
 */
export function locateEvidencePassages(
  text: string,
  claimScope: ClaimScope,
  maxPassages: number = 3
): EvidencePassage[] {
  // 1. Basic chunking (split by double newlines or large sentence blocks)
  // For a more robust version, use semantic chunking. This is a V1 heuristic.
  const rawParagraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 50);
  
  if (rawParagraphs.length === 0) {
    return [];
  }

  // Create overlapping windows of ~2 paragraphs
  const chunks: { text: string; index: number; section: string | null }[] = [];
  let currentSection: string | null = null;
  
  // Very naive section header detection
  const sectionHeaderPattern = /^(abstract|introduction|background|methods?|materials and methods|results|findings|discussion|conclusion|limitations|acknowledgements)\b/i;

  for (let i = 0; i < rawParagraphs.length; i++) {
    const p = rawParagraphs[i];
    
    // Check if this paragraph looks like a section header (short, matches known words)
    if (p.length < 100 && sectionHeaderPattern.test(p)) {
      currentSection = p.split('\n')[0].trim();
      continue;
    }

    const chunkText = [p];
    if (i + 1 < rawParagraphs.length) {
      chunkText.push(rawParagraphs[i+1]);
    }

    chunks.push({
      text: chunkText.join('\n\n'),
      index: i,
      section: currentSection || null,
    });
  }

  // 2. Score chunks against the claim
  const claimTokens = new Set(
    claimScope.sentence.toLowerCase().split(/[\s\.,;:]+/).filter(t => t.length > 3)
  );
  const atomicTokensList = claimScope.atomicClaims.map(c => 
    new Set(c.toLowerCase().split(/[\s\.,;:]+/).filter(t => t.length > 3))
  );

  const scoredChunks = chunks.map((chunk: any) => {
    const chunkLower = chunk.text.toLowerCase();
    const chunkTokens = chunkLower.split(/[\s\.,;:]+/);
    const chunkTokenSet = new Set(chunkTokens);

    let overlapScore = 0;
    
    // Score based on main sentence
    for (const token of Array.from(claimTokens)) {
      if (chunkTokenSet.has(token as string)) overlapScore += 1;
    }

    // Boost score if atomic claims are present
    for (const atomicTokens of atomicTokensList) {
      let atomicOverlap = 0;
      for (const token of Array.from(atomicTokens)) {
        if (chunkTokenSet.has(token as string)) atomicOverlap += 1;
      }
      if (atomicOverlap >= Math.ceil(atomicTokens.size * 0.5)) {
        overlapScore += 2; // Strong boost for matching atomic claim semantics
      }
    }

    // Boost for exact phrase matches
    const claimPhrase = claimScope.sentence.toLowerCase().trim();
    if (chunkLower.includes(claimPhrase)) {
      overlapScore += 10;
    }

    return { ...chunk, overlapScore };
  });

  // 3. Rank and select top K
  scoredChunks.sort((a, b) => b.overlapScore - a.overlapScore);
  
  // Filter out chunks that have zero overlap
  const relevantChunks = scoredChunks.filter(c => c.overlapScore > 0).slice(0, maxPassages);

  return relevantChunks.map(c => ({
    text: c.text,
    section: c.section,
    page: null, // Hard to infer without PDF bounding boxes
    sourceUrl: null, // Will be populated by the caller
  }));
}
