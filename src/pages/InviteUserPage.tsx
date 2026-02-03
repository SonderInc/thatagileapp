import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getDataStore } from '../lib/adapters';
import { ROLE_LABELS } from '../types';
import type { Role } from '../types';
import type { UserProfile } from '../types';

const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];

const InviteUserPage: React.FC = () => {
  const { currentUser, currentTenantId, setViewMode, canAddUser, getCurrentCompany, getRoleLabel } = useStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(['developer']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<UserProfile[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingRoles, setEditingRoles] = useState<Role[]>([]);
  const [roleSaveLoading, setRoleSaveLoading] = useState(false);
  const company = getCurrentCompany();
  const isAdmin = currentUser?.roles?.includes('admin') ?? false;

  const handleRolesMultiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value as Role);
    setSelectedRoles(selected);
  };

  const toggleEditingRole = (role: Role) => {
    setEditingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const loadDirectory = async () => {
    if (!currentTenantId) return;
    setDirectoryLoading(true);
    setDirectoryError(null);
    try {
      if (currentUser?.id) {
        const profile = await getDataStore().getUserProfile(currentUser.id);
        if (profile) {
          const hasCurrentCompany = profile.companies?.some((c) => c.companyId === currentTenantId) || profile.companyId === currentTenantId;
          const profileToSync = hasCurrentCompany
            ? profile
            : {
                ...profile,
                companyId: profile.companyId ?? currentTenantId,
                companies: [...(profile.companies ?? []), { companyId: currentTenantId, roles: (currentUser.roles ?? []) as Role[] }],
              };
          await getDataStore().setUserProfile(profileToSync);
        }
      }
      const users = await getDataStore().getCompanyUsers(currentTenantId);
      setCompanyUsers(users);
    } catch {
      setCompanyUsers([]);
      setDirectoryError('Could not load user directory. Try refreshing.');
    } finally {
      setDirectoryLoading(false);
    }
  };

  useEffect(() => {
    if (currentTenantId) loadDirectory();
  }, [currentTenantId]);

  // Ensure current user's profile has adminCompanyIds so Firestore rules allow role updates (one-time sync for existing admins)
  useEffect(() => {
    if (!isAdmin || !currentUser?.id) return;
    getDataStore()
      .getUserProfile(currentUser.id)
      .then((profile) => {
        if (profile) getDataStore().setUserProfile(profile).catch(() => {});
      })
      .catch(() => {});
  }, [isAdmin, currentUser?.id]);

  if (!canAddUser()) {
    return (
      <div className="page-container">
        <div className="form-error">You do not have permission to manage users.</div>
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
      const profile = await getDataStore().getUserProfile(currentUser.id);
      if (profile) {
        const hasCurrentCompany = profile.companies?.some((c) => c.companyId === currentTenantId) || profile.companyId === currentTenantId;
        const profileToSync = hasCurrentCompany
          ? profile
          : {
              ...profile,
              companyId: profile.companyId ?? currentTenantId,
              companies: [...(profile.companies ?? []), { companyId: currentTenantId, roles: (currentUser.roles ?? []) as Role[] }],
            };
        await getDataStore().setUserProfile(profileToSync);
      }
      const count = await getDataStore().getCompanyUserCount(currentTenantId);
      if (count >= seats) {
        setError('Seat limit reached. Add a licence or buy more seats.');
        setLoading(false);
        return;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[InviteUserPage] Seat limit check failed:', err);
      setError('Could not check seat limit. Try refreshing the page and try again.');
      setLoading(false);
      return;
    }
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedFirst || !trimmedLast) {
      setError('First name and last name are required.');
      setLoading(false);
      return;
    }
    if (selectedRoles.length === 0) {
      setError('Select at least one role.');
      setLoading(false);
      return;
    }
    try {
      const { token } = await getDataStore().addInvite({
        email: trimmedEmail,
        companyId: currentTenantId,
        roles: selectedRoles,
        invitedBy: currentUser.id,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        ...(employeeNumber.trim() && { employeeNumber: employeeNumber.trim() }),
        ...(phone.trim() && { phone: phone.trim() }),
      });
      const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
      const link = `${base}?invite=${token}`;
      setInviteLink(link);
      setFirstName('');
      setLastName('');
      setEmail('');
      setEmployeeNumber('');
      setPhone('');
      await loadDirectory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const startEditRoles = (profile: UserProfile) => {
    const entry = profile.companies?.find((c) => c.companyId === currentTenantId);
    setEditingUser(profile);
    setEditingRoles(entry?.roles ?? []);
  };

  const cancelEditRoles = () => {
    setEditingUser(null);
    setEditingRoles([]);
  };

  const saveEditRoles = async () => {
    if (!editingUser || !currentTenantId) return;
    if (editingRoles.length === 0) {
      setError('Select at least one role.');
      return;
    }
    setRoleSaveLoading(true);
    setError(null);
    try {
      const companies = editingUser.companies ?? [];
      const updatedCompanies = companies.some((c) => c.companyId === currentTenantId)
        ? companies.map((c) =>
            c.companyId === currentTenantId ? { companyId: c.companyId, roles: editingRoles } : c
          )
        : [...companies, { companyId: currentTenantId, roles: editingRoles }];
      await getDataStore().setUserProfile({
        ...editingUser,
        companies: updatedCompanies,
      });
      setEditingUser(null);
      setEditingRoles([]);
      await loadDirectory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setRoleSaveLoading(false);
    }
  };

  const getRolesForCompany = (profile: UserProfile): Role[] => {
    const entry = profile.companies?.find((c) => c.companyId === currentTenantId);
    return entry?.roles ?? [];
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
          Back
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>User Management</h1>
      </div>
      {error && <div className="form-error">{error}</div>}

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
          Invite user
        </h2>
        {inviteLink && (
          <div className="form-success" style={{ marginBottom: '16px' }}>
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
            <label className="form-label">First name *</label>
            <input
              type="text"
              className="form-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="Jane"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Last name *</label>
            <input
              type="text"
              className="form-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              placeholder="Doe"
            />
          </div>
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
          <div className="form-group">
            <label className="form-label">Employee number</label>
            <input
              type="text"
              className="form-input"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone number</label>
            <input
              type="text"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Roles *</label>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280' }}>
              Hold Ctrl (Windows) or Cmd (Mac) to select multiple roles.
            </p>
            <select
              multiple
              size={6}
              value={selectedRoles}
              onChange={handleRolesMultiChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              {ALL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Adding…' : 'Add User'}
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
          User directory
        </h2>
        {directoryLoading ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading users…</p>
        ) : directoryError ? (
          <p style={{ color: '#b91c1c', fontSize: '14px' }}>{directoryError}</p>
        ) : companyUsers.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No users in this company yet.</p>
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600', color: '#374151' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600', color: '#374151' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600', color: '#374151' }}>Roles</th>
                  {isAdmin && (
                    <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600', color: '#374151' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {companyUsers.map((profile) => (
                  <React.Fragment key={profile.uid}>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', color: '#111827' }}>
                        {profile.displayName || '—'}
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280' }}>{profile.email}</td>
                      <td style={{ padding: '12px' }}>
                        {editingUser?.uid === profile.uid ? (
                          <span style={{ color: '#6b7280', fontSize: '13px' }}>Editing below</span>
                        ) : (
                          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {getRolesForCompany(profile).map((r) => (
                              <span
                                key={r}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#e5e7eb',
                                  fontSize: '12px',
                                  color: '#374151',
                                }}
                              >
                                {getRoleLabel(r)}
                              </span>
                            ))}
                            {getRolesForCompany(profile).length === 0 && (
                              <span style={{ color: '#9ca3af' }}>—</span>
                            )}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {editingUser?.uid === profile.uid ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={cancelEditRoles}
                              style={{ marginRight: '8px' }}
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => startEditRoles(profile)}
                            >
                              Edit roles
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {editingUser?.uid === profile.uid && (
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <td colSpan={isAdmin ? 4 : 3} style={{ padding: '16px' }}>
                          <div style={{ marginBottom: '12px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                            Edit roles for {profile.email}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px', marginBottom: '12px' }}>
                            {ALL_ROLES.map((role) => (
                              <label
                                key={role}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={editingRoles.includes(role)}
                                  onChange={() => toggleEditingRole(role)}
                                />
                                <span>{getRoleLabel(role)}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={saveEditRoles}
                            disabled={roleSaveLoading || editingRoles.length === 0}
                          >
                            {roleSaveLoading ? 'Saving…' : 'Save roles'}
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default InviteUserPage;
