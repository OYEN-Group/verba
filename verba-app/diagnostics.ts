import { getProviderConfiguration } from './src/lib/research/providerConfig';
import { SourceProvider } from './src/lib/sources/types';

const providers: SourceProvider[] = [
  'google_books',
  'serper',
  'openalex',
  'crossref',
  'open_library',
  'arxiv'
];

console.log("=== Verba Provider Configuration Diagnostics ===");
console.log("Environment:", process.env.NODE_ENV || 'development');
console.log("------------------------------------------------");

for (const provider of providers) {
  const config = getProviderConfiguration(provider);
  if (config.configured) {
    console.log(`[OK] ${provider}: configured`);
  } else {
    console.log(`[WARN] ${provider}: missing_configuration`);
  }
}

console.log("------------------------------------------------");
console.log("NOTE: This diagnostic script verifies configuration availability");
console.log("in the runtime environment where it is executed. If deploying");
console.log("to a remote server, ensure the same environment variables are");
console.log("available to the production Next.js runtime.");
