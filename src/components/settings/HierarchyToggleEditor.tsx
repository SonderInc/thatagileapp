import React, { useState, useEffect } from 'react';
import type { WorkItemType, ProductHierarchyConfig } from '../../types';
import { ALL_WORK_ITEM_TYPES, getTypeLabel, ensureValidHierarchy } from '../../utils/hierarchy';

export interface HierarchyToggleEditorProps {
  productId: string;
  config: ProductHierarchyConfig | null;
  canEdit: boolean;
  onSave: (config: Pick<ProductHierarchyConfig, 'enabledTypes' | 'order'>) => Promise<void>;
  getTypeLabel?: (type: WorkItemType) => string;
}

const HierarchyToggleEditor: React.FC<HierarchyToggleEditorProps> = ({
  productId,
  config,
  canEdit,
  onSave,
  getTypeLabel: getTypeLabelProp,
}) => {
  const resolvedConfig = ensureValidHierarchy(config ? { ...config, productId } : { productId });
  const [enabledTypes, setEnabledTypes] = useState<Set<WorkItemType>>(() => new Set(resolvedConfig.enabledTypes));
  const [order, setOrder] = useState<WorkItemType[]>(() => [...resolvedConfig.order]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setEnabledTypes(new Set(resolvedConfig.enabledTypes));
    setOrder([...resolvedConfig.order]);
  }, [productId, resolvedConfig.enabledTypes.join(','), resolvedConfig.order.join(',')]);

  const label = getTypeLabelProp ?? getTypeLabel;

  const toggleType = (t: WorkItemType) => {
    if (!canEdit) return;
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      if (next.size === 0) return prev;
      return next;
    });
  };

  const moveUp = (index: number) => {
    if (!canEdit || index <= 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (!canEdit || index >= order.length - 1) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!canEdit) return;
    const enabled = order.filter((t) => enabledTypes.has(t));
    if (enabled.length === 0) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await onSave({ enabledTypes: enabled, order });
      setSaveMessage('Saved.');
      setTimeout(() => setSaveMessage(null), 2500);
    } catch {
      setSaveMessage('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
        Enable or disable work item types for this product. Disabled types are hidden from create menus and pickers; existing items of that type remain and can be viewed.
      </p>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {ALL_WORK_ITEM_TYPES.map((t) => (
            <label
              key={t}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                border: `1px solid ${enabledTypes.has(t) ? '#3b82f6' : '#d1d5db'}`,
                borderRadius: '6px',
                cursor: canEdit ? 'pointer' : 'default',
                fontSize: '14px',
                backgroundColor: enabledTypes.has(t) ? '#eff6ff' : '#fff',
              }}
            >
              <input
                type="checkbox"
                checked={enabledTypes.has(t)}
                onChange={() => toggleType(t)}
                disabled={!canEdit || (enabledTypes.size === 1 && enabledTypes.has(t))}
              />
              {label(t)}
            </label>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>Display order</div>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280' }}>Order of types in create menus and backlog.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {order.map((t, index) => (
            <div
              key={t}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                backgroundColor: '#fafafa',
              }}
            >
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={!canEdit || index === 0}
                style={{ padding: '4px 8px', fontSize: '12px', cursor: canEdit && index > 0 ? 'pointer' : 'not-allowed' }}
              >
                Up
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={!canEdit || index === order.length - 1}
                style={{ padding: '4px 8px', fontSize: '12px', cursor: canEdit && index < order.length - 1 ? 'pointer' : 'not-allowed' }}
              >
                Down
              </button>
              <span style={{ flex: 1, fontSize: '14px' }}>{label(t)}</span>
            </div>
          ))}
        </div>
      </div>
      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saveMessage && <span style={{ fontSize: '14px', color: '#059669' }}>{saveMessage}</span>}
        </div>
      )}
      {!canEdit && (
        <p style={{ fontSize: '13px', color: '#6b7280' }}>You do not have permission to edit hierarchy for this product.</p>
      )}
    </div>
  );
};

export default HierarchyToggleEditor;
