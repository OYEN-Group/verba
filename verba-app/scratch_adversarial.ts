import { fetchAccessibleContent } from './src/lib/evidence/reader/fetcher';
import { locateEvidencePassages } from './src/lib/evidence/reader/locator';
import { evaluateClaimSupport } from './src/lib/evidence/reader/evaluator';
import { ClaimScope } from './src/lib/citations/scope';
import { NormalizedSource } from './src/lib/sources/types';

async function runTests() {
  console.log('--- ADVERSARIAL VERIFICATION PASS ---');
  
  // Helper to run evaluator directly
  const runEvaluatorTest = async (name: string, claimSentence: string, passageText: string) => {
    console.log(`\n=== Test: ${name} ===`);
    const scope: ClaimScope = {
      citationId: '1',
      sourceId: '1',
      sentence: claimSentence,
      paragraphContext: claimSentence,
      candidateClaimText: claimSentence,
      atomicClaims: [claimSentence],
      claimHash: 'hash',
    };
    
    const passages = [{
      text: passageText,
      section: 'Results',
      page: null,
      sourceUrl: null
    }];
    
    try {
      const result = await evaluateClaimSupport(scope, passages);
      console.log(`Status: ${result.status}`);
      console.log(`Response: ${result.conversationalResponse}`);
    } catch (e: any) {
      console.error('Error:', e.message);
    }
  };

  await runEvaluatorTest(
    'Numerical Exact Match',
    'AI reduced diagnostic errors by 42%.',
    'In our study, we found that AI reduced diagnostic errors by 42% compared to the control group.'
  );

  await runEvaluatorTest(
    'Numerical Mismatch',
    'AI reduced diagnostic errors by 42%.',
    'In our study, we found that AI reduced diagnostic errors by 24% compared to the control group.'
  );

  await runEvaluatorTest(
    'Unit Mismatch',
    'The recommended dose is 500 mg.',
    'The recommended dose for this treatment is 500 g per day.'
  );

  await runEvaluatorTest(
    'Population/Geography Mismatch',
    'Nigerian university students showed higher retention rates.',
    'American university students showed higher retention rates in the study.'
  );

  await runEvaluatorTest(
    'Causation vs Correlation',
    'Social media usage caused anxiety in teenagers.',
    'Our findings indicate that social media usage is associated with anxiety in teenagers.'
  );

  console.log('\n--- FETCH ADVERSARIAL TESTS ---');
  const runFetchTest = async (name: string, source: NormalizedSource) => {
    console.log(`\n=== Fetch Test: ${name} ===`);
    try {
      const fetched = await fetchAccessibleContent(source);
      console.log(`Method: ${fetched?.method || 'null'}`);
      console.log(`Text Length: ${fetched?.text?.length || 0}`);
      if (fetched?.text) console.log(`Preview: ${fetched.text.substring(0, 100)}...`);
    } catch (e: any) {
      console.log(`Error: ${e.message}`);
    }
  };

  await runFetchTest('Broken PDF / SSRF Test', {
    id: 'test', title: 'Test', authors: [], year: 2020,
    locations: [{ url: 'http://127.0.0.1/secret.pdf', content_type: 'pdf', type: 'repository' }]
  } as unknown as NormalizedSource);

  await runFetchTest('HTML Disguised as PDF', {
    id: 'test', title: 'Test', authors: [], year: 2020,
    locations: [{ url: 'https://example.com/not-a-pdf.pdf', content_type: 'pdf', type: 'repository' }]
  } as unknown as NormalizedSource);

  await runFetchTest('Clean OA HTML (eLife)', {
    id: 'test', title: 'Test', authors: [], year: 2020,
    locations: [{ url: 'https://elifesciences.org/articles/93444', content_type: 'html_full_text', type: 'publisher' }]
  } as unknown as NormalizedSource);
  
  await runFetchTest('Real PDF (arXiv)', {
    id: 'test', title: 'Test', authors: [], year: 2020,
    locations: [{ url: 'https://arxiv.org/pdf/1706.03762.pdf', content_type: 'pdf', type: 'repository' }]
  } as unknown as NormalizedSource);

}

runTests().then(() => console.log('\nDone.')).catch(console.error);
