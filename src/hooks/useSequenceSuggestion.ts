import { useState, useCallback } from 'react';
import { apiRequest } from '../api/client';

export type SequenceContext = 'tasks' | 'stories';

export type SuggestionState = { context: SequenceContext; ids: string[] } | null;

export function useSequenceSuggestion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionState>(null);

  const requestSequence = useCallback(
    async (
      payload: Record<string, unknown>,
      context: SequenceContext,
      opts?: { onSuggestToast?: () => void }
    ): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<unknown>('/.netlify/functions/sequence-tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        let orderedIds: string[];
        if (Array.isArray(res)) {
          orderedIds = res as string[];
        } else if (res != null && typeof res === 'object' && Array.isArray((res as { orderedIds?: string[] }).orderedIds)) {
          orderedIds = (res as { orderedIds: string[] }).orderedIds;
        } else {
          throw new Error('Invalid response: expected { orderedIds: string[] } or string[]');
        }
        setSuggestion({ context, ids: orderedIds });
        opts?.onSuggestToast?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const applyOrder = useCallback(
    async (args: {
      orderedIds: string[];
      updateWorkItem: (id: string, patch: { order: number }) => void;
    }): Promise<void> => {
      const { orderedIds, updateWorkItem } = args;
      for (let index = 0; index < orderedIds.length; index++) {
        await Promise.resolve(updateWorkItem(orderedIds[index], { order: index }));
      }
      setSuggestion(null);
      setError(null);
    },
    []
  );

  const clear = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  return { loading, error, suggestion, requestSequence, applyOrder, clear };
}
