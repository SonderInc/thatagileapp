import { describe, it, expect } from 'vitest';
import { runImport } from './workItemImporter';

const COMPANY_ID = 'company-1';
const DESCRIPTION_MARKER = 'IF YOU CAN READ THIS...';

const TARGET_EPIC_ID = 'epic-1';

describe('workItemImporter', () => {
  describe('description persistence', () => {
    it('persists description from top-level when importing a feature', async () => {
      const created: { id: string; description?: string }[] = [];
      const addWorkItem = async (item: { id: string; description?: string }) => {
        created.push({ id: item.id, description: item.description });
      };
      const updateWorkItem = async () => {};

      const payload = {
        version: '1',
        mode: 'add-to-epic' as const,
        targetEpicId: TARGET_EPIC_ID,
        items: [
          {
            importId: 'f1',
            type: 'feature' as const,
            title: 'A feature',
            description: DESCRIPTION_MARKER,
          },
        ],
      };

      const result = await runImport(payload, COMPANY_ID, [], addWorkItem, updateWorkItem);

      expect(result.errors).toHaveLength(0);
      expect(result.created).toBe(1);
      const feature = created.find((c) => c.id.includes('f1'));
      expect(feature).toBeDefined();
      expect(feature!.description).toBe(DESCRIPTION_MARKER);
    });

    it('persists description from fields.description when importing a feature', async () => {
      const created: { id: string; description?: string }[] = [];
      const addWorkItem = async (item: { id: string; description?: string }) => {
        created.push({ id: item.id, description: item.description });
      };
      const updateWorkItem = async () => {};

      const payload = {
        version: '1',
        mode: 'add-to-epic' as const,
        targetEpicId: TARGET_EPIC_ID,
        items: [
          {
            importId: 'f1',
            type: 'feature' as const,
            title: 'A feature',
            fields: { description: DESCRIPTION_MARKER },
          },
        ],
      };

      const result = await runImport(payload, COMPANY_ID, [], addWorkItem, updateWorkItem);

      expect(result.errors).toHaveLength(0);
      expect(result.created).toBe(1);
      const feature = created.find((c) => c.id.includes('f1'));
      expect(feature).toBeDefined();
      expect(feature!.description).toBe(DESCRIPTION_MARKER);
    });
  });
});
