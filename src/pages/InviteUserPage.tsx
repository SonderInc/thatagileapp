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
      <div className="page-container">
        <div className="form-error">You do not have permission to invite users.</div>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
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
    <div className="page-container">
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
          Back
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>Invite user</h1>
      </div>
      {error && <div className="form-error">{error}</div>}
      {inviteLink && (
        <div className="form-success">
          <div style={{ fontWeight: '500', marginBottom: '8px' }}>Invite link (share with the user):</div>
          <code style={{ wordBreak: 'break-all', fontSize: '12px' }}>{inviteLink}</code>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(inviteLink)}
            className="btn-secondary"
            style={{ display: 'block', marginTop: '8px' }}
          >
            Copy link
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@company.com"
          />
        </div>
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label">Role *</label>
          <select
            className="form-input"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {roleOptions}
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create invite link'}
        </button>
      </form>
    </div>
  );
};

export default InviteUserPage;
