import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClaudeEditDraftStore } from './useClaudeEditDraftStore';
import { useOpenAIEditDraftStore } from './useOpenAIEditDraftStore';

describe('provider editor draft lifecycle', () => {
  const openAIKey = 'openai:models-route-regression';
  const claudeKey = 'claude:models-route-regression';

  beforeEach(() => {
    vi.useFakeTimers();
    useOpenAIEditDraftStore.getState().clearDraft(openAIKey);
    useClaudeEditDraftStore.getState().clearDraft(claudeKey);
  });

  afterEach(() => {
    useOpenAIEditDraftStore.getState().clearDraft(openAIKey);
    useClaudeEditDraftStore.getState().clearDraft(claudeKey);
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('keeps the OpenAI form when the editor route is replaced by /models', () => {
    const store = useOpenAIEditDraftStore.getState();

    store.acquireDraft(openAIKey);
    store.setDraftForm(openAIKey, (form) => ({
      ...form,
      name: 'custom provider',
      baseUrl: 'https://example.com/v1',
    }));
    store.releaseDraft(openAIKey);
    store.acquireDraft(openAIKey);

    vi.runOnlyPendingTimers();

    expect(useOpenAIEditDraftStore.getState().drafts[openAIKey]?.form).toMatchObject({
      name: 'custom provider',
      baseUrl: 'https://example.com/v1',
    });

    store.releaseDraft(openAIKey);
    vi.runOnlyPendingTimers();
    expect(useOpenAIEditDraftStore.getState().drafts[openAIKey]).toBeUndefined();
  });

  it('keeps the Claude form when the editor route is replaced by /models', () => {
    const store = useClaudeEditDraftStore.getState();

    store.acquireDraft(claudeKey);
    store.setDraftForm(claudeKey, (form) => ({
      ...form,
      name: 'custom provider',
      apiKey: 'secret',
      baseUrl: 'https://example.com',
    }));
    store.releaseDraft(claudeKey);
    store.acquireDraft(claudeKey);

    vi.runOnlyPendingTimers();

    expect(useClaudeEditDraftStore.getState().drafts[claudeKey]?.form).toMatchObject({
      name: 'custom provider',
      apiKey: 'secret',
      baseUrl: 'https://example.com',
    });

    store.releaseDraft(claudeKey);
    vi.runOnlyPendingTimers();
    expect(useClaudeEditDraftStore.getState().drafts[claudeKey]).toBeUndefined();
  });
});
