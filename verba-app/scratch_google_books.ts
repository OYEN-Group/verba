import { searchGoogleBooks } from './src/lib/research/providers/googleBooks';
import { executeProviders } from './src/lib/research/executor';
import { getProviderConfiguration } from './src/lib/research/providerConfig';

// Mock the environment
process.env.GOOGLE_BOOKS_API_KEY = 'test_key';

const originalFetch = global.fetch;

// Mock setup
let fetchMockQueue: { status: number, ok: boolean, data?: any, delayMs?: number, throws?: Error }[] = [];

global.fetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const currentMock = fetchMockQueue.shift();
  if (!currentMock) {
    return originalFetch(url, options);
  }

  if (currentMock.delayMs) {
    await new Promise(r => setTimeout(r, currentMock.delayMs));
  }

  if (currentMock.throws) {
    throw currentMock.throws;
  }

  return {
    ok: currentMock.ok,
    status: currentMock.status,
    statusText: currentMock.ok ? 'OK' : 'Error',
    json: async () => currentMock.data || { items: [] },
  } as Response;
};

// Test Runner
async function runTests() {
  console.log('--- RUNNING GOOGLE BOOKS RETRY TESTS ---\n');
  
  const dummyItem = {
    id: "test",
    volumeInfo: { title: "Test Book" }
  };

  // Test A
  fetchMockQueue = [{ status: 200, ok: true, data: { items: [dummyItem] } }];
  let res = await executeProviders(['google_books'], 'test');
  console.log('Test A: First 200');
  console.log('Result:', res.providerStatus.google_books.status === 'succeeded' ? 'PASS' : 'FAIL', res.providerStatus.google_books.status);

  // Test B
  fetchMockQueue = [
    { status: 503, ok: false },
    { status: 200, ok: true, data: { items: [dummyItem] } }
  ];
  res = await executeProviders(['google_books'], 'test');
  console.log('Test B: 503 then 200');
  console.log('Result:', res.providerStatus.google_books.status === 'succeeded' ? 'PASS' : 'FAIL', res.providerStatus.google_books.status);

  // Test C
  fetchMockQueue = [
    { status: 503, ok: false },
    { status: 503, ok: false }
  ];
  res = await executeProviders(['google_books'], 'test');
  console.log('Test C: 503 then 503');
  console.log('Result:', res.providerStatus.google_books.status === 'failed' && res.providerStatus.google_books.error === 'temporary_unavailable' ? 'PASS' : 'FAIL', res.providerStatus.google_books);

  // Test D
  const timeoutErr = new Error('timeout');
  timeoutErr.name = 'TimeoutError';
  fetchMockQueue = [
    { status: 0, ok: false, throws: timeoutErr },
    { status: 200, ok: true, data: { items: [dummyItem] } }
  ];
  res = await executeProviders(['google_books'], 'test');
  console.log('Test D: timeout then 200');
  console.log('Result:', res.providerStatus.google_books.status === 'succeeded' ? 'PASS' : 'FAIL', res.providerStatus.google_books.status);

  // Test E
  fetchMockQueue = [
    { status: 0, ok: false, throws: timeoutErr },
    { status: 0, ok: false, throws: timeoutErr }
  ];
  res = await executeProviders(['google_books'], 'test');
  console.log('Test E: timeout then timeout');
  console.log('Result:', res.providerStatus.google_books.status === 'timeout' ? 'PASS' : 'FAIL', res.providerStatus.google_books);

  // Test F
  fetchMockQueue = [{ status: 403, ok: false }];
  res = await executeProviders(['google_books'], 'test');
  console.log('Test F: 403');
  console.log('Result:', res.providerStatus.google_books.status === 'failed' && res.providerStatus.google_books.error === 'authorization_or_configuration_error' ? 'PASS' : 'FAIL', res.providerStatus.google_books);

  // Test G
  fetchMockQueue = [{ status: 429, ok: false }];
  res = await executeProviders(['google_books'], 'test');
  console.log('Test G: 429');
  console.log('Result:', res.providerStatus.google_books.status === 'failed' && res.providerStatus.google_books.error === 'rate_limited' ? 'PASS' : 'FAIL', res.providerStatus.google_books);

}

runTests().catch(console.error);
