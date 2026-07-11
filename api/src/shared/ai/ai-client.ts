/**
 * Unified AI client factory for DubaiAuto.
 *
 * Supports two providers — configured via .env:
 *
 * ── Anthropic Direct ─────────────────────────────────────────────────────────
 *   AI_PROVIDER=anthropic  (default)
 *   ANTHROPIC_API_KEY=sk-ant-api03-...
 *
 * ── Google Cloud Vertex AI + Claude ──────────────────────────────────────────
 *   AI_PROVIDER=vertex
 *   VERTEX_PROJECT_ID=my-gcp-project
 *   VERTEX_REGION=us-east5          (or europe-west1, asia-southeast1, etc.)
 *   GOOGLE_APPLICATION_CREDENTIALS=/app/config/service-account.json  (optional)
 *   # OR mount the JSON key and set the path above
 *
 * Same API surface — all modules call createAIClient() and get a compatible client.
 */

import Anthropic from '@anthropic-ai/sdk';

// ── Model name mapping ────────────────────────────────────────────────────────
// Vertex AI uses @-versioned model IDs; Anthropic Direct uses plain names.
const MODEL_MAP: Record<string, Record<string, string>> = {
  anthropic: {
    sonnet: 'claude-sonnet-4-6',
    haiku:  'claude-haiku-4-5-20251001',
    opus:   'claude-opus-4-6',
  },
  vertex: {
    sonnet: 'claude-sonnet-4-5@20251001',
    haiku:  'claude-haiku-4-5@20251001',
    opus:   'claude-opus-4-5@20251001',
  },
};

type ModelAlias = 'sonnet' | 'haiku' | 'opus';

function getProvider(): 'anthropic' | 'vertex' {
  const p = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
  return p === 'vertex' ? 'vertex' : 'anthropic';
}

/** Returns the correct model ID string for the active provider. */
export function aiModel(alias: ModelAlias = 'sonnet'): string {
  return MODEL_MAP[getProvider()][alias];
}

/** Creates and returns the Anthropic-compatible client for the active provider. */
export function createAIClient(): Anthropic {
  const provider = getProvider();

  if (provider === 'vertex') {
    const projectId = process.env.VERTEX_PROJECT_ID;
    const region    = process.env.VERTEX_REGION || 'us-east5';

    if (!projectId) {
      throw new Error(
        '[AI Client] AI_PROVIDER=vertex but VERTEX_PROJECT_ID is not set. ' +
        'Add VERTEX_PROJECT_ID=your-gcp-project to your .env'
      );
    }

    // AnthropicVertex is imported dynamically to avoid crashing on startup
    // when Vertex env vars aren't set (i.e. when using Anthropic Direct).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: AnthropicVertex } = require('@anthropic-ai/sdk/vertex');

    console.log(`[AI Client] Using Vertex AI — project=${projectId} region=${region}`);
    return new AnthropicVertex({ projectId, region }) as unknown as Anthropic;
  }

  // Default: Anthropic Direct
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes('your-key-here')) {
    console.warn('[AI Client] ANTHROPIC_API_KEY is not set — AI features will fail.');
  }
  return new Anthropic({ apiKey });
}

/** Singleton — reused across the NestJS lifecycle. */
let _client: Anthropic | null = null;
export function getAIClient(): Anthropic {
  if (!_client) _client = createAIClient();
  return _client;
}
