import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { TERMS } from '../../glossary/terms';
import { PACKS } from '../../glossary/packs';
import { getAllChoicesForKey, resolveLabel } from '../../services/terminology/terminologyResolver';
import type { GlossaryKey } from '../../glossary/glossaryKeys';
import type { TerminologySettings } from '../../services/terminology/terminologyTypes';
import type { FrameworkId } from '../../glossary/packs/types';
import { getDefaultTerminologySettings } from '../../services/terminology/terminologyService';

const TerminologySettingsPage: React.FC = () => {
  const {
    currentTenantId,
    terminologySettings,
    productTerminologySettings,
    terminologyProductId,
    workItems,
    setViewMode,
    saveTerminology,
    saveProductTerminology,
    loadProductTerminology,
    setTerminologyProductId,
  } = useStore();

  const product = terminologyProductId ? workItems.find((i) => i.id === terminologyProductId) : null;
  const isProductMode = terminologyProductId != null;

  const [draft, setDraft] = useState<TerminologySettings>(() =>
    isProductMode && productTerminologySettings ? productTerminologySettings : terminologySettings
  );
  useEffect(() => {
    if (terminologyProductId) loadProductTerminology(terminologyProductId);
  }, [terminologyProductId, loadProductTerminology]);
  useEffect(() => {
    if (isProductMode && productTerminologySettings) setDraft(productTerminologySettings);
    else if (!isProductMode) setDraft(terminologySettings);
  }, [isProductMode, terminologySettings, productTerminologySettings]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [addingCustomForKey, setAddingCustomForKey] = useState<GlossaryKey | null>(null);
  const [addCustomInputValue, setAddCustomInputValue] = useState('');
  const ADD_CUSTOM_SENTINEL = '__add__';

  const filteredTerms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TERMS;
    return TERMS.filter(
      (t) =>
        t.defaultLabel.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q) ||
        resolveLabel(t.key, draft).toLowerCase().includes(q)
    );
  }, [search, draft]);

  const effectiveDraft = draft;

  const handlePackChange = (packId: FrameworkId) => {
    setDraft((prev) => ({ ...prev, activePackId: packId }));
  };

  const handleOverrideChange = (key: GlossaryKey, value: string) => {
    setDraft((prev) => {
      const overrides = { ...prev.overrides };
      if (value.trim() === '') delete overrides[key];
      else overrides[key] = value.trim();
      return { ...prev, overrides };
    });
  };

  const handleSave = async () => {
    if (isProductMode) {
      if (!terminologyProductId) return;
      setSaving(true);
      setSaveMessage(null);
      try {
        await saveProductTerminology(terminologyProductId, effectiveDraft);
        setSaveMessage('Saved.');
        setTimeout(() => setSaveMessage(null), 2500);
      } catch (err) {
        setSaveMessage(err instanceof Error ? err.message : 'Save failed');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!currentTenantId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await saveTerminology(currentTenantId, effectiveDraft);
      setSaveMessage('Saved.');
      setTimeout(() => setSaveMessage(null), 2500);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    setDraft(getDefaultTerminologySettings());
  };

  if (!isProductMode && !currentTenantId) {
    return (
      <div className="page-container">
        <p style={{ color: '#6b7280' }}>Select a company to configure terminology.</p>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('settings')}>
          Back to Settings
        </button>
      </div>
    );
  }

  const packOptions = PACKS.map((p) => ({ id: p.id, name: p.name }));

  const handleBack = () => {
    if (isProductMode) {
      setTerminologyProductId(null);
      setViewMode('backlog');
    } else {
      setViewMode('settings');
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" onClick={handleBack}>
          {isProductMode ? 'Back to Backlog' : 'Back to Settings'}
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>
          {isProductMode && product ? `Terminology for ${product.title}` : 'Terminology'}
        </h1>
      </div>
      <p className="page-description" style={{ marginTop: 0, marginBottom: '24px' }}>
        {isProductMode
          ? 'Choose a framework label pack and overrides for this product. Labels apply when viewing this product\'s backlog and in the work item form.'
          : 'Choose a framework label pack and optionally override individual terms. Labels are used across Backlog, Planning Board, and forms.'}
      </p>

      <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
          Framework pack:
        </label>
        <select
          value={effectiveDraft.activePackId}
          onChange={(e) => handlePackChange(e.target.value as FrameworkId)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '160px',
          }}
        >
          {packOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="search"
          placeholder="Search by default label, key, or effective label..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn-secondary" onClick={handleResetAll}>
          Reset All
        </button>
        {saveMessage && (
          <span style={{ fontSize: '14px', color: saveMessage === 'Saved.' ? '#059669' : '#dc2626', alignSelf: 'center' }}>
            {saveMessage}
          </span>
        )}
      </div>

      <p style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
        Custom label: choose a suggestion or use Add to create your own.
      </p>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: '600', color: '#374151' }}>Term (key)</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: '600', color: '#374151' }}>Framework label</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: '600', color: '#374151' }}>Custom label</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: '600', color: '#374151' }}>Effective label</th>
            </tr>
          </thead>
          <tbody>
            {filteredTerms.map((term) => {
              const packLabel = (() => {
                const pack = PACKS.find((p) => p.id === effectiveDraft.activePackId);
                return pack?.labels[term.key] ?? term.defaultLabel;
              })();
              const choices = getAllChoicesForKey(term.key);
              const effective = resolveLabel(term.key, effectiveDraft);
              const customValue = effectiveDraft.overrides[term.key] ?? '';
              return (
                <tr key={term.key} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 12px', color: '#111827' }}>
                    <span style={{ fontWeight: '500' }}>{term.defaultLabel}</span>
                    <span style={{ marginLeft: '6px', fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                      {term.key}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{packLabel}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {addingCustomForKey === term.key ? (
                      <input
                        type="text"
                        value={addCustomInputValue}
                        onChange={(e) => setAddCustomInputValue(e.target.value)}
                        onBlur={() => {
                          const v = addCustomInputValue.trim();
                          if (v) handleOverrideChange(term.key, v);
                          setAddingCustomForKey(null);
                          setAddCustomInputValue('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setAddingCustomForKey(null);
                            setAddCustomInputValue('');
                          } else if (e.key === 'Enter') {
                            const v = addCustomInputValue.trim();
                            if (v) handleOverrideChange(term.key, v);
                            setAddingCustomForKey(null);
                            setAddCustomInputValue('');
                          }
                        }}
                        placeholder="Type custom label…"
                        autoFocus
                        style={{
                          width: '100%',
                          maxWidth: '200px',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    ) : (
                      <select
                        value={customValue}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === ADD_CUSTOM_SENTINEL) {
                            setAddingCustomForKey(term.key);
                            setAddCustomInputValue('');
                          } else {
                            handleOverrideChange(term.key, v);
                          }
                        }}
                        style={{
                          width: '100%',
                          maxWidth: '200px',
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      >
                        <option value="">Use framework</option>
                        {choices.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        {customValue && !choices.includes(customValue) && (
                          <option value={customValue}>{customValue}</option>
                        )}
                        <option value={ADD_CUSTOM_SENTINEL}>Add custom label…</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: '500', color: '#111827' }}>{effective}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TerminologySettingsPage;
