import { describe, expect, it } from 'vitest';
import {
  applyCandidatePrice,
  buildSelectedSyncModels,
  buildPriceFromDraft,
  buildModelPriceRows,
  buildModelPriceSummary,
  buildSyncPriceModelsFromUsage,
  filterModelPriceRows,
} from './modelPricesPageModel';

const usage = {
  apis: {
    'POST /v1/chat/completions': {
      models: {
        'alias-fast': {
          details: [
            {
              timestamp: '2026-05-22T00:00:00Z',
              source: 'source',
              resolved_model: 'gpt-5.5',
              tokens: {},
              failed: false,
            },
            {
              timestamp: '2026-05-22T00:01:00Z',
              source: 'source',
              resolved_model: 'gpt-5.5',
              tokens: {},
              failed: true,
            },
          ],
        },
      },
    },
  },
};

describe('modelPricesPageModel', () => {
  it('builds sync models from requested, resolved, and saved prices', () => {
    expect(
      buildSyncPriceModelsFromUsage(usage, {
        'manual-model': { prompt: 1, completion: 2, cache: 0.5 },
      })
    ).toEqual(['alias-fast', 'gpt-5.5', 'manual-model']);
  });

  it('uses checked models when present and falls back to the full sync scope', () => {
    expect(buildSelectedSyncModels(['a', 'b'], {})).toEqual(['a', 'b']);
    expect(buildSelectedSyncModels(['a', 'b'], { b: true })).toEqual(['b']);
  });

  it('marks missing models with candidates before saved rows', () => {
    const rows = buildModelPriceRows(
      usage,
      {
        'gpt-5.5': { prompt: 1, completion: 2, cache: 0.5 },
      },
      [
        {
          model: 'alias-fast',
          candidates: [
            {
              sourceModelId: 'openai/gpt-5.5',
              score: 0.75,
              reason: 'similar',
              price: { prompt: 1, completion: 2, cache: 0.5 },
            },
          ],
        },
      ]
    );

    expect(rows[0]).toMatchObject({
      model: 'alias-fast',
      hasPrice: false,
      candidateCount: 1,
      requestedCalls: 1,
      calls: 1,
    });
    expect(buildModelPriceSummary(rows)).toMatchObject({
      total: 2,
      saved: 1,
      missing: 1,
      candidates: 1,
    });
    expect(filterModelPriceRows(rows, 'candidates', '')).toHaveLength(1);
  });

  it('counts calls from management API wrapped usage payloads', () => {
    const rows = buildModelPriceRows(
      { usage },
      {
        'alias-fast': { prompt: 1, completion: 2, cache: 0.5 },
      }
    );

    expect(rows.find((row) => row.model === 'alias-fast')).toMatchObject({
      calls: 1,
      requestedCalls: 1,
    });
  });

  it('applies a candidate under the local model name', () => {
    const next = applyCandidatePrice({}, 'alias-fast', {
      sourceModelId: 'openai/gpt-5.5',
      score: 0.75,
      reason: 'similar',
      price: { prompt: 1, completion: 2, cache: 0.5, source: 'openrouter' },
    });

    expect(next['alias-fast']).toMatchObject({
      prompt: 1,
      completion: 2,
      cache: 0.5,
      source: 'openrouter',
      sourceModelId: 'openai/gpt-5.5',
    });
  });

  it('marks manually entered prices with a manual source', () => {
    expect(
      buildPriceFromDraft({
        model: 'manual-model',
        prompt: '1',
        completion: '2',
        cacheRead: '0.5',
        cacheCreation: '3',
      })
    ).toMatchObject({
      prompt: 1,
      completion: 2,
      cache: 0.5,
      cacheRead: 0.5,
      cacheCreation: 3,
      source: 'manual',
    });
  });
});
