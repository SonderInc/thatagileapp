import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { getDataStore } from '../lib/adapters';
import { ROLE_LABELS } from '../types';
import type { Role } from '../types';

const InviteUserPage: React.FC = () => {
  const { currentUser, currentTenantId, setViewMode, canAddUser, getCurrentCompany } = useStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('developer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const company = getCurrentCompany();

  if (!canAddUser()) {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
        <p style={{ color: '#b91c1c', marginBottom: '16px' }}>You do not have permission to invite users.</p>
        <button
          type="button"
          onClick={() => setViewMode('landing')}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteLink(null);
    setLoading(true);
    if (!currentTenantId || !currentUser) {
      setError('No company or user context.');
      setLoading(false);
      return;
    }
    const seats = company?.seats ?? 50;
    try {
      const count = await getDataStore().getCompanyUserCount(currentTenantId);
      if (count >= seats) {
        setError('Seat limit reached. Add a licence or buy more seats.');
        setLoading(false);
        return;
      }
    } catch {
      setError('Could not check seat limit.');
      setLoading(false);
      return;
    }
    try {
      const { token } = await getDataStore().addInvite({
        email: email.trim(),
        companyId: currentTenantId,
        roles: [role],
        invitedBy: currentUser.id,
      });
      const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
      const link = `${base}?invite=${token}`;
      setInviteLink(link);
      setEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = (Object.entries(ROLE_LABELS) as [Role, string][]).map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ));

  return (
    <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={() => setViewMode('landing')}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Back
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#111827' }}>
          Invite user
        </h1>
      </div>
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
      {inviteLink && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#d1fae5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          <div style={{ fontWeight: '500', marginBottom: '8px' }}>Invite link (share with the user):</div>
          <code style={{ wordBreak: 'break-all', fontSize: '12px' }}>{inviteLink}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(inviteLink);
            }}
            style={{
              display: 'block',
              marginTop: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Copy link
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@company.com"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Role *
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            {roleOptions}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Creating…' : 'Create invite link'}
        </button>
      </form>
    </div>
  );
};

export default InviteUserPage;
