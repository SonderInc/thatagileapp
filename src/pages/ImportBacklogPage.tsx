/**
 * Import Backlog (JSON): paste/upload -> validate + preview -> confirm -> summary.
 * Uses workItemImporter for validation and runImport; enforces hierarchy via src/utils/hierarchy.
 */
import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getDataStore } from '../lib/adapters';
import {
  validateImportPayload,
  runImport,
  type ImportPayload,
  type ValidationResult,
  type ImportResult,
} from '../lib/import/workItemImporter';
import type { WorkItemType } from '../types';

type Step = 'paste' | 'preview' | 'summary';

const ImportBacklogPage: React.FC = () => {
  const { currentTenantId, firebaseUser, setViewMode, setWorkItems, setTenantCompanies, setCurrentTenantId, setCurrentUser, getTypeLabel: getStoreTypeLabel } = useStore();
  const [step, setStep] = useState<Step>('paste');
  const [rawJson, setRawJson] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId = currentTenantId;
  const getTypeLabelForCompany = useCallback(
    (type: WorkItemType) => getStoreTypeLabel(type),
    [getStoreTypeLabel]
  );

  const handleValidate = useCallback(() => {
    setError(null);
    setValidation(null);
    setPayload(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      setError('Invalid JSON');
      return;
    }
    const result = validateImportPayload(parsed);
    setValidation(result);
    if (result.ok) {
      setPayload(parsed as ImportPayload);
      setStep('preview');
    }
  }, [rawJson]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setRawJson(text);
      setError(null);
      setValidation(null);
    };
    reader.readAsText(file);
  }, []);

  const handleImport = useCallback(async () => {
    if (!payload) {
      setError('No payload.');
      return;
    }
    setLoading(true);
    setError(null);
    setImportResult(null);
    try {
      const store = getDataStore();
      let targetId: string;
      if (payload.mode === 'add-to-company') {
        targetId = payload.targetCompanyId ?? companyId ?? '';
        if (!targetId) {
          setError('No company selected. Set targetCompanyId in JSON or select current company.');
          setLoading(false);
          return;
        }
      } else {
        const firstCompany = payload.items?.find((i) => i.type === 'company');
        if (!firstCompany?.title || !companyId) {
          setError('create-company requires a company-type item with title, or select current company.');
          setLoading(false);
          return;
        }
        const newCompanyId = `company-${Date.now()}`;
        const now = new Date();
        await store.addTenantCompany({
          id: newCompanyId,
          name: firstCompany.title.trim(),
          slug: firstCompany.title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'imported',
          createdAt: now,
          updatedAt: now,
          seats: 50,
        });
        targetId = newCompanyId;
      }
      const existing = await store.getWorkItems(targetId);
      const result = await runImport(
        payload,
        targetId,
        existing,
        (item) => store.addWorkItem(item),
        (id, updates) => store.updateWorkItem(id, updates)
      );
      setImportResult(result);
      setStep('summary');
      const updated = await store.getWorkItems(targetId);
      setWorkItems(updated);
      if (payload.mode === 'create-company' && firebaseUser) {
        const profile = await store.getUserProfile(firebaseUser.uid);
        const companies = profile?.companies ?? [];
        await store.setUserProfile({
          uid: firebaseUser.uid,
          email: profile?.email ?? firebaseUser.email ?? '',
          displayName: profile?.displayName ?? firebaseUser.displayName ?? '',
          companyId: targetId,
          companies: [...companies, { companyId: targetId, roles: ['admin'] }],
        });
        const tenants = await store.getTenantCompanies();
        setTenantCompanies(tenants);
        setCurrentTenantId(targetId);
        setCurrentUser({
          id: firebaseUser.uid,
          name: profile?.displayName ?? firebaseUser.displayName ?? '',
          email: profile?.email ?? firebaseUser.email ?? '',
          roles: ['admin'],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [payload, companyId, firebaseUser, setWorkItems, setTenantCompanies, setCurrentTenantId, setCurrentUser]);

  const handleBack = () => {
    setStep('paste');
    setValidation(null);
    setPayload(null);
    setImportResult(null);
    setError(null);
  };

  const handleClose = () => setViewMode('backlog');

  return (
    <div style={{ padding: '24px', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
        Import Backlog (JSON)
      </h1>

      {step === 'paste' && (
        <>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Paste JSON or upload a file. See docs/IMPORT_BACKLOG_JSON.md for format.
          </p>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              style={{ marginBottom: '8px' }}
            />
          </div>
          <textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            placeholder='{ "version": "1.0", "mode": "add-to-company", "targetCompanyId": "...", "items": [ ... ] }'
            rows={12}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: '13px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
            }}
          />
          {error && (
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '8px' }}>
              {error}
            </div>
          )}
          {validation && !validation.ok && (
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
              <strong>Validation errors:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                {validation.errors.map((e, i) => (
                  <li key={i}>{e.importId ? `${e.importId}: ${e.message}` : e.message}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleValidate}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Validate &amp; preview
            </button>
            <button type="button" onClick={handleClose} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
              Cancel
            </button>
          </div>
        </>
      )}

      {step === 'preview' && validation?.ok && payload && (
        <>
          <p style={{ color: '#059669', marginBottom: '16px' }}>Validation passed. Preview:</p>
          <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <strong>Counts by type:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              {(Object.entries(validation.countsByType) as [WorkItemType, number][]).map(([type, count]) =>
                count > 0 ? (
                  <li key={type}>{getTypeLabelForCompany(type)}: {count}</li>
                ) : null
              )}
            </ul>
            <strong style={{ display: 'block', marginTop: '12px' }}>First 10 titles:</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              {validation.previewTitles.slice(0, 10).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </div>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Target company: <code>{payload.mode === 'add-to-company' ? (payload.targetCompanyId ?? companyId) : companyId}</code>
          </p>
          {error && (
            <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '8px' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading || !companyId}
              style={{
                padding: '10px 20px',
                backgroundColor: '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              {loading ? 'Importing…' : 'Confirm import'}
            </button>
            <button type="button" onClick={handleBack} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
              Back
            </button>
            <button type="button" onClick={handleClose} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
              Cancel
            </button>
          </div>
        </>
      )}

      {step === 'summary' && importResult && (
        <>
          <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', marginBottom: '16px' }}>
            <p><strong>Created:</strong> {importResult.created}</p>
            <p><strong>Skipped (already exist):</strong> {importResult.skipped}</p>
            {importResult.errors.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <strong>Errors:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: '20px', color: '#b91c1c' }}>
                  {importResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Done (view backlog)
            </button>
            <button type="button" onClick={handleBack} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
              Import again
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ImportBacklogPage;
