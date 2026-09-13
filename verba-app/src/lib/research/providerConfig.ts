import { SourceProvider } from '../sources/types';

export interface ProviderConfiguration {
  configured: boolean;
  reason?: 'missing_configuration';
}

/**
 * Single source of truth for checking if a research provider is properly configured 
 * in the current runtime environment.
 * 
 * Providers requiring credentials will check their respective process.env keys.
 * Providers requiring no credentials always return configured = true.
 */
export function getProviderConfiguration(provider: SourceProvider): ProviderConfiguration {
  switch (provider) {
    case 'google_books':
      return {
        configured: Boolean(process.env.GOOGLE_BOOKS_API_KEY?.trim()),
        reason: process.env.GOOGLE_BOOKS_API_KEY?.trim() ? undefined : 'missing_configuration'
      };
      
    case 'serper':
      return {
        configured: Boolean(process.env.SERPER_API_KEY?.trim()),
        reason: process.env.SERPER_API_KEY?.trim() ? undefined : 'missing_configuration'
      };
      
    case 'openalex':
      // OpenAlex has an optional API key for a higher rate limit, but works without it.
      // So it's always configured.
      return { configured: true };
      
    case 'crossref':
    case 'open_library':
    case 'arxiv':
      return { configured: true };
      
    default:
      // Unknown providers default to true (they might fail at runtime, but we don't block here)
      return { configured: true };
  }
}
