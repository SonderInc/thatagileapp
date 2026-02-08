import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FRAMEWORK_PRESETS, type PresetId } from '../../presets';
import * as frameworkSettingsService from '../../services/frameworkSettingsService';
import { getFrameworkPreset } from '../../lib/frameworkPresets';
import * as frameworkMigrationService from '../../services/frameworkMigrationService';

const FrameworkPresetsSection: React.FC = () => {
  const {
    currentTenantId,
    workItems,
    setFrameworkPreset,
    loadFrameworkSettings,
    firebaseUser,
  } = useStore();

  const [frameworkPresetId, setFrameworkPresetId] = useState<PresetId | ''>('');
  const [frameworkProductId, setFrameworkProductId] = useState<string | null>(null);
  const [frameworkApplyBusy, setFrameworkApplyBusy] = useState(false);
  const [frameworkApplyError, setFrameworkApplyError] = useState<string | null>(null);
  const [frameworkApplySuccess, setFrameworkApplySuccess] = useState<string | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [lastMigrationJob, setLastMigrationJob] = useState<{ jobId: string; summary?: { movedItems: number; flaggedForReview: number } } | null>(null);

  const products = workItems.filter((i) => i.type === 'product' && i.companyId === currentTenantId);

  const handleApplyCompanyPreset = async () => {
    if (!currentTenantId || !frameworkPresetId) return;
    setFrameworkApplyError(null);
    setFrameworkApplySuccess(null);
    setFrameworkApplyBusy(true);
    try {
      await setFrameworkPreset(currentTenantId, frameworkPresetId);
      setFrameworkApplySuccess('Company preset applied.');
    } catch (e) {
      setFrameworkApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setFrameworkApplyBusy(false);
    }
  };

  const handleApplyProductPreset = async () => {
    if (!currentTenantId || !frameworkProductId || !frameworkPresetId || !firebaseUser?.uid) return;
    setFrameworkApplyError(null);
    setFrameworkApplySuccess(null);
    setFrameworkApplyBusy(true);
    try {
      await frameworkSettingsService.applyProductPreset(
        frameworkProductId,
        currentTenantId,
        frameworkPresetId as PresetId,
        firebaseUser.uid
      );
      await loadFrameworkSettings(currentTenantId, frameworkProductId);
      setFrameworkApplySuccess('Product preset applied.');
    } catch (e) {
      setFrameworkApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setFrameworkApplyBusy(false);
    }
  };

  const handleMigrationScan = async () => {
    if (!currentTenantId || !frameworkPresetId) return;
    setMigrationError(null);
    setLastMigrationJob(null);
    setMigrationBusy(true);
    try {
      const preset = getFrameworkPreset(frameworkPresetId);
      const result = await frameworkMigrationService.startFrameworkMigration(
        currentTenantId,
        frameworkPresetId,
        'DRY_RUN',
        { enabledTypes: preset.enabledTypes, hierarchy: preset.hierarchy as Record<string, string[]> }
      );
      setLastMigrationJob({ jobId: result.jobId, summary: result.summary });
    } catch (e) {
      setMigrationError(e instanceof Error ? e.message : String(e));
    } finally {
      setMigrationBusy(false);
    }
  };

  const handleMigrationApply = async () => {
    if (!currentTenantId || !frameworkPresetId) return;
    setMigrationError(null);
    setLastMigrationJob(null);
    setMigrationBusy(true);
    try {
      const preset = getFrameworkPreset(frameworkPresetId);
      const result = await frameworkMigrationService.startFrameworkMigration(
        currentTenantId,
        frameworkPresetId,
        'APPLY',
        { enabledTypes: preset.enabledTypes, hierarchy: preset.hierarchy as Record<string, string[]> }
      );
      setLastMigrationJob({ jobId: result.jobId, summary: result.summary });
    } catch (e) {
      setMigrationError(e instanceof Error ? e.message : String(e));
    } finally {
      setMigrationBusy(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: 0 }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Framework presets</h2>
      <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
        Apply a preset (SAFe, LeSS, Spotify, Apple, DaD) to set work item labels, enabled types, and hierarchy for the company or a single product.
      </p>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
          Product (for Apply to this product)
        </label>
        <select
          value={frameworkProductId ?? ''}
          onChange={(e) => setFrameworkProductId(e.target.value || null)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '240px',
          }}
        >
          <option value="">Select a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <select
          value={frameworkPresetId}
          onChange={(e) => setFrameworkPresetId((e.target.value || '') as PresetId | '')}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', minWidth: '140px' }}
        >
          <option value="">Select preset</option>
          {FRAMEWORK_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn-primary"
          disabled={!frameworkPresetId || frameworkApplyBusy}
          onClick={handleApplyCompanyPreset}
          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '14px' }}
        >
          Apply to company
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={!frameworkPresetId || !frameworkProductId || frameworkApplyBusy}
          onClick={handleApplyProductPreset}
          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '14px' }}
        >
          Apply to this product
        </button>
      </div>
      {frameworkApplyError && <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '8px' }}>{frameworkApplyError}</p>}
      {frameworkApplySuccess && <p style={{ fontSize: '14px', color: '#059669', marginBottom: '8px' }}>{frameworkApplySuccess}</p>}

      <p style={{ marginTop: '16px', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
        After changing preset, run a compatibility scan or apply automated migration (re-parents invalid items; logs moves for rollback).
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          className="btn-secondary"
          disabled={!frameworkPresetId || migrationBusy}
          onClick={handleMigrationScan}
          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '14px' }}
        >
          Run migration scan (dry run)
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={!frameworkPresetId || migrationBusy}
          onClick={handleMigrationApply}
          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '14px' }}
        >
          Apply migration
        </button>
      </div>
      {migrationError && <p style={{ fontSize: '14px', color: '#dc2626', marginTop: '8px' }}>{migrationError}</p>}
      {lastMigrationJob && (
        <p style={{ fontSize: '14px', color: '#059669', marginTop: '8px' }}>
          Job {lastMigrationJob.jobId} completed.
          {lastMigrationJob.summary && (
            <> Moved: {lastMigrationJob.summary.movedItems}; flagged for review: {lastMigrationJob.summary.flaggedForReview}</>
          )}
        </p>
      )}
    </div>
  );
};

export default FrameworkPresetsSection;
