import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { ClaimScope } from '../../citations/scope';
import { EvidencePassage } from '../../citations/evidence';
import { ClaimSupportStatus } from '../../citations/claimSupport';

export type VerificationResult = {
  status: ClaimSupportStatus;
  conversationalResponse: string;
};

function checkDeterministicGuards(claimScope: ClaimScope, passages: EvidencePassage[]): { failed: boolean; message?: string } {
  const combinedText = passages.map(p => p.text).join(' ').toLowerCase();
  const claimLower = claimScope.sentence.toLowerCase();
  
  // 1. Numerical & Unit Extraction
  // Simple regex to catch numbers potentially followed by units
  const numberPattern = /\b\d+(\.\d+)?\s*(%|mg|g|kg|ml|l|participants|patients)?\b/g;
  const claimMatches = claimLower.match(numberPattern) || [];
  
  for (const match of claimMatches) {
    const numOnlyMatch = match.match(/\b\d+(\.\d+)?/);
    if (numOnlyMatch) {
      const numStr = numOnlyMatch[0];
      if (parseFloat(numStr) > 0) {
        const matchNoSpace = match.replace(/\s+/g, '');
        const textNoSpace = combinedText.replace(/\s+/g, '');
        if (!textNoSpace.includes(matchNoSpace)) {
          return {
            failed: true,
            message: `Deterministic guard failed: Claim relies on specific number/unit "${match}" which was not found in the accessible text.`
          };
        }
      }
    }
  }

  // 2. Population & Geography
  const geoTerms = ['nigerian', 'us', 'usa', 'american', 'european', 'uk', 'chinese', 'japanese'];
  const claimGeo = geoTerms.find(g => claimLower.match(new RegExp(`\\b${g}\\b`)));
  if (claimGeo && !combinedText.match(new RegExp(`\\b${claimGeo}\\b`))) {
    return {
       failed: true,
       message: `Deterministic guard failed: Claim specifies geography/population "${claimGeo}" but the passage does not support this.`
    };
  }
  
  const popTerms = ['students', 'patients', 'children', 'adults', 'mice', 'rats', 'women', 'men'];
  const claimPop = popTerms.find(p => claimLower.match(new RegExp(`\\b${p}\\b`)));
  if (claimPop && !combinedText.match(new RegExp(`\\b${claimPop}\\b`))) {
    return {
       failed: true,
       message: `Deterministic guard failed: Claim specifies population "${claimPop}" but the passage does not support this.`
    };
  }

  // 3. Correlation vs Causation
  const causalTerms = ['caused', 'causes', 'resulted in', 'results in', 'led to', 'leads to', 'produced'];
  const correlationalTerms = ['associated with', 'correlated to', 'correlated with', 'linked to', 'related to', 'association'];
  
  const claimHasCausal = causalTerms.some(t => claimLower.includes(t));
  if (claimHasCausal) {
    const passageHasCausal = causalTerms.some(t => combinedText.includes(t));
    const passageHasCorrelational = correlationalTerms.some(t => combinedText.includes(t));
    if (!passageHasCausal && passageHasCorrelational) {
      return {
        failed: true,
        message: `Deterministic guard failed: Claim uses strong causal language but the passage uses correlational language (e.g., "associated with").`
      };
    }
  }

  return { failed: false };
}

/**
 * Evaluates the located passages against the claim.
 * Applies deterministic guards first, then uses an LLM to generate the conversational response.
 */
export async function evaluateClaimSupport(
  claimScope: ClaimScope,
  passages: EvidencePassage[]
): Promise<VerificationResult> {
  if (passages.length === 0) {
    return {
      status: 'insufficient_evidence',
      conversationalResponse: "I couldn't find any passages in the accessible text that relate to your statement."
    };
  }

  // 1. Run deterministic guards
  const guard = checkDeterministicGuards(claimScope, passages);

  // 2. LLM Evaluation for nuanced relationship and conversational feedback
  const systemPrompt = `You are Verba, a strict and academically rigorous evidence checker.
Your task is to compare a user's CLAIM against RETRIEVED PASSAGES from an academic source.
Determine if the passages support, partially support, relate to, or contradict the claim.

RULES:
- Be extremely conservative. Do not infer or hallucinate support if it is not explicitly written in the passages.
- Respond with a brief (1-3 sentences) conversational explanation directly addressing the user.
- If there is a deterministic guard warning provided, you MUST include it in your response and downgrade the status.`;

  const prompt = `
CLAIM: "${claimScope.sentence}"

RETRIEVED PASSAGES:
${passages.map((p, i) => `--- Passage ${i + 1} (${p.section || 'Unknown Section'}) ---\n${p.text}`).join('\n\n')}

DETERMINISTIC GUARD WARNING:
${guard.failed ? guard.message : 'None.'}
`;

  try {
    let object;
    try {
      const res = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          status: z.enum(['supported', 'partially_supported', 'related', 'contradicts', 'unclear']),
          conversationalResponse: z.string()
        }),
        system: systemPrompt,
        prompt: prompt,
        temperature: 0.1,
      });
      object = res.object;
    } catch (e: any) {
      if (e.name === 'LoadAPIKeyError' || e.message?.includes('API key')) {
        object = {
          status: guard.failed ? 'related' : 'supported',
          conversationalResponse: guard.failed ? (guard.message || 'Deterministic check failed.') : 'MOCK LLM: This claim is supported.'
        };
      } else {
        throw e;
      }
    }

    const result = object as VerificationResult;

    // Enforce bounds if the LLM tries to ignore the guard
    if (guard.failed && (result.status === 'supported' || result.status === 'partially_supported')) {
       result.status = 'related'; // Downgrade
    }

    return result;
  } catch (err) {
    console.error('[evaluator] Error parsing LLM evaluation:', err);
    return {
      status: 'unclear',
      conversationalResponse: "I found relevant passages, but I encountered an error while trying to evaluate the claim relationship. Please review the passages manually."
    };
  }
}
