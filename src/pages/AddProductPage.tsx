import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { WorkItem } from '../types';
import { ArrowLeft } from 'lucide-react';

const AddProductPage: React.FC = () => {
  const { addWorkItem, setViewMode, selectedCompanyId } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleBack = () => {
    setViewMode('landing');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const newItem: WorkItem = {
      id: `item-${Date.now()}`,
      type: 'product',
      title: title.trim() || 'New Product',
      description: description.trim() || undefined,
      status: 'backlog',
      parentId: selectedCompanyId ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      await addWorkItem(newItem);
      setViewMode('landing');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) console.error('[AddProduct] Save failed:', err);
      const userMsg =
        msg === 'Firebase not configured'
          ? 'Firebase not configured. Add .env.local with Firebase config or use demo data.'
          : msg?.includes('Save timed out')
            ? 'Save timed out. Check your network and Firestore rules.'
            : msg || 'Failed to save. Check console and Firestore rules.';
      setError(userMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '24px',
          maxWidth: '600px',
        }}
      >
        <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
          Add Product
        </h1>

        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Product name"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Optional description"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 24px',
                backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Create Product'}
            </button>
            <button
              type="button"
              onClick={handleBack}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductPage;
