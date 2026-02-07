import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getAuth, getDataStore } from '../lib/adapters';
import { mergeProfileForBackfill } from '../lib/firestore';
import { isAdminForCompany } from '../lib/roles';
import { ROLE_LABELS } from '../types';
import type { Role } from '../types';
import type { UserProfile } from '../types';
import type { Team } from '../types';

const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];

type UserManagementTab = 'create' | 'directory' | 'teams';

const InviteUserPage: React.FC = () => {
  const {
    currentUser,
    currentTenantId,
    setViewMode,
    setCurrentUser,
    canAddUser,
    getCurrentCompany,
    getRoleLabel,
    teams,
    loadTeams,
    addTeam,
    updateTeam,
    deleteTeam,
  } = useStore();
  const [activeTab, setActiveTab] = useState<UserManagementTab>('create');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(['developer']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<UserProfile[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingRoles, setEditingRoles] = useState<Role[]>([]);
  const [roleSaveLoading, setRoleSaveLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamCreating, setTeamCreating] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const company = getCurrentCompany();
  const isAdminFromProfile = Boolean(myProfile && currentTenantId && isAdminForCompany(myProfile, currentTenantId));
  const isAdmin = isAdminFromProfile || (currentUser?.roles?.includes('admin') ?? false);

  const resolveMemberName = (uid: string): string => {
    const p = companyUsers.find((u) => u.uid === uid);
    return p ? (p.displayName || p.email || uid) : uid;
  };

  const handleRolesMultiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value as Role);
    setSelectedRoles(selected);
  };

  const toggleEditingRole = (role: Role) => {
    setEditingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const buildProfileWithCompany = async (): Promise<UserProfile | null> => {
    if (!currentUser?.id || !currentTenantId) return null;
    let profile = await getDataStore().getUserProfile(currentUser.id);
    if (!profile) {
      profile = {
        uid: currentUser.id,
        email: currentUser.email ?? '',
        displayName: currentUser.name ?? '',
        companyId: currentTenantId,
        companies: [{ companyId: currentTenantId, roles: (currentUser.roles ?? []) as Role[] }],
      };
    } else {
      const hasCurrentCompany = profile.companies?.some((c) => c.companyId === currentTenantId) || profile.companyId === currentTenantId;
      if (!hasCurrentCompany) {
        profile = {
          ...profile,
          companyId: profile.companyId ?? currentTenantId,
          companies: [...(profile.companies ?? []), { companyId: currentTenantId, roles: (currentUser.roles ?? []) as Role[] }],
        };
      }
    }
    return profile;
  };

  const loadDirectory = async (retryAfterSync = false) => {
    if (!currentTenantId || !currentUser?.id) return;
    setDirectoryLoading(true);
    setDirectoryError(null);
    try {
      try {
        const profile = await buildProfileWithCompany();
        if (!profile) {
          setDirectoryLoading(false);
          return;
        }
        const merged = mergeProfileForBackfill(profile, currentTenantId, currentUser?.roles ?? []);
        await getDataStore().setUserProfile(merged);
      } catch (syncErr) {
        console.warn('[InviteUserPage] Profile sync before directory load failed:', syncErr);
        setCompanyUsers([]);
        setDirectoryError('Could not update your profile for this company. Please retry or ensure you have access.');
        setDirectoryLoading(false);
        return;
      }
      const users = await getDataStore().getCompanyUsers(currentTenantId);
      setCompanyUsers(users);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isPermissionDenied = message.includes('permission-denied') || message.includes('Permission denied') || (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'permission-denied');
      console.error('[InviteUserPage] Load user directory failed:', err);

      if (isPermissionDenied && !retryAfterSync) {
        try {
          const profile = await buildProfileWithCompany();
          if (profile) {
            const merged = mergeProfileForBackfill(profile, currentTenantId, currentUser?.roles ?? []);
            await getDataStore().setUserProfile(merged);
            const users = await getDataStore().getCompanyUsers(currentTenantId);
            setCompanyUsers(users);
            setDirectoryLoading(false);
            return;
          }
        } catch (retryErr) {
          console.warn('[InviteUserPage] Retry after permission denied failed:', retryErr);
        }
      }

      setCompanyUsers([]);
      setDirectoryError(
        isPermissionDenied
          ? 'Permission denied. In Firebase Console go to Firestore Database → Rules, paste your project\'s firestore.rules and click Publish. Then ensure your user document in users/<uid> has companyIds and adminCompanyIds (see docs/DEPLOYMENT.md).'
          : 'Could not load user directory. Try refreshing. See console for details.'
      );
    } finally {
      setDirectoryLoading(false);
    }
  };

  useEffect(() => {
    if (!currentTenantId || !currentUser?.id) return;
    getDataStore()
      .getUserProfile(currentUser.id)
      .then((profile) => {
        setMyProfile(profile ?? null);
        if (import.meta.env.DEV && profile) {
          console.log('[InviteUserPage] Admin/tenant diagnostics', {
            currentTenantId,
            'myProfile.companyId': profile.companyId,
            'myProfile.adminCompanyIds': profile.adminCompanyIds,
            isAdminForCompany: isAdminForCompany(profile, currentTenantId),
          });
        }
      })
      .catch(() => setMyProfile(null));
  }, [currentTenantId, currentUser?.id]);

  useEffect(() => {
    if (currentTenantId && currentUser?.id) loadDirectory();
  }, [currentTenantId, currentUser?.id]);

  useEffect(() => {
    if (currentTenantId) loadTeams(currentTenantId);
  }, [currentTenantId, loadTeams]);

  // Sync store so canAddUser() passes when profile says admin (fixes false-negative permission)
  useEffect(() => {
    if (!isAdminFromProfile || !currentUser?.id) return;
    if (currentUser.roles?.includes('admin')) return;
    setCurrentUser({
      ...currentUser,
      roles: [...new Set([...(currentUser.roles ?? []), 'admin'])] as Role[],
    });
  }, [isAdminFromProfile, currentUser?.id, currentUser?.roles, setCurrentUser]);

  // Ensure current user's profile has adminCompanyIds so Firestore rules allow role updates (one-time sync for existing admins)
  useEffect(() => {
    if (!isAdmin || !currentUser?.id || !currentTenantId) return;
    getDataStore()
      .getUserProfile(currentUser.id)
      .then((profile) => {
        if (profile) {
          const roles = profile.companies?.find((c) => c.companyId === currentTenantId)?.roles ?? currentUser.roles ?? [];
          const rolesWithAdmin = roles.includes('admin') ? roles : ['admin', ...roles];
          const merged = mergeProfileForBackfill(profile, currentTenantId, rolesWithAdmin);
          getDataStore().setUserProfile(merged).catch(() => {});
        }
      })
      .catch(() => {});
  }, [isAdmin, currentUser?.id, currentTenantId, currentUser?.roles]);

  const canManageUsers = canAddUser() || isAdminFromProfile;
  if (!canManageUsers) {
    return (
      <div className="page-container">
        <div className="form-error">You do not have permission to manage users.</div>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
          Back to Home
        </button>
      </div>
    );
  }

  const CREATE_USER_FN_PATH = '/.netlify/functions/create-company-user';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreateUserSuccess(null);
    setLoading(true);
    if (!currentTenantId || !currentUser) {
      setError('No company or user context.');
      setLoading(false);
      return;
    }
    const seats = company?.seats ?? 50;
    try {
      let profile = await getDataStore().getUserProfile(currentUser.id);
      if (!profile) {
        profile = {
          uid: currentUser.id,
          email: currentUser.email ?? '',
          displayName: currentUser.name ?? '',
          companyId: currentTenantId,
          companies: [{ companyId: currentTenantId, roles: (currentUser.roles ?? []) as Role[] }],
        };
      } else {
        const hasCurrentCompany = profile.companies?.some((c) => c.companyId === currentTenantId) || profile.companyId === currentTenantId;
        if (!hasCurrentCompany) {
          profile = {
            ...profile,
            companyId: profile.companyId ?? currentTenantId,
            companies: [...(profile.companies ?? []), { companyId: currentTenantId, roles: (currentUser.roles ?? []) as Role[] }],
          };
        }
      }
      const merged = mergeProfileForBackfill(profile, currentTenantId, currentUser.roles ?? []);
      await getDataStore().setUserProfile(merged);
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
    const idToken = await getAuth().getIdToken();
    if (!idToken) {
      setError('Please sign in again.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(CREATE_USER_FN_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: trimmedEmail,
          firstName: trimmedFirst,
          lastName: trimmedLast,
          companyId: currentTenantId,
          roles: selectedRoles,
          ...(employeeNumber.trim() && { employeeNumber: employeeNumber.trim() }),
          ...(phone.trim() && { phone: phone.trim() }),
        }),
      });
      const rawData = await res.json().catch(() => ({}));
      const errBody = rawData as { error?: string };
      if (!res.ok) {
        setError(errBody.error ?? 'Could not create user.');
        setLoading(false);
        return;
      }
      setCreateUserSuccess(
        'User created. They can sign in with email and password 12341234 and will be prompted to change it on first login.'
      );
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
      const adminCompanyIds =
        editingRoles.includes('admin')
          ? [...new Set([...(editingUser.adminCompanyIds ?? []), currentTenantId])]
          : undefined;
      await getDataStore().setUserProfile({
        ...editingUser,
        companies: updatedCompanies,
        ...(adminCompanyIds !== undefined && { adminCompanyIds }),
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

  const handleCreateTeam = async (teamType: 'team' | 'team-of-teams') => {
    if (!currentTenantId || !newTeamName.trim()) return;
    setTeamError(null);
    setTeamCreating(true);
    try {
      const now = new Date();
      const team: Team = {
        id: `team-${Date.now()}`,
        name: newTeamName.trim(),
        companyId: currentTenantId,
        memberIds: [],
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.id,
        teamType,
      };
      await addTeam(team);
      setNewTeamName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTeamError(msg);
    } finally {
      setTeamCreating(false);
    }
  };

  const handleAddTeamMember = async (teamId: string, uid: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || team.memberIds.includes(uid)) return;
    await updateTeam(teamId, { memberIds: [...team.memberIds, uid] });
  };

  const handleRemoveTeamMember = async (teamId: string, uid: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    await updateTeam(teamId, { memberIds: team.memberIds.filter((id) => id !== uid) });
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Delete this team? This cannot be undone.')) return;
    try {
      await deleteTeam(teamId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTeamError(msg);
    }
  };

  const tabs: { id: UserManagementTab; label: string }[] = [
    { id: 'create', label: 'Create User' },
    { id: 'directory', label: 'User Directory' },
    { id: 'teams', label: 'Team Management' },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
          Back
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>User Management</h1>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '24px',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {error && <div className="form-error">{error}</div>}

      {activeTab === 'create' && (
      <section style={{ marginBottom: '32px' }}>
        {createUserSuccess && (
          <div className="form-success" style={{ marginBottom: '16px' }}>
            {createUserSuccess}
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
            {loading ? 'Creating…' : 'Create User'}
          </button>
        </form>
      </section>
      )}

      {activeTab === 'directory' && (
      <section>
        {directoryLoading ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading users…</p>
        ) : directoryError ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <p style={{ color: '#b91c1c', fontSize: '14px', margin: 0 }}>{directoryError}</p>
            <button type="button" className="btn-secondary" onClick={() => loadDirectory()}>
              Retry
            </button>
          </div>
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
      )}

      {activeTab === 'teams' && (
      <section>
        {teamError && (
          <p style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '12px' }}>{teamError}</p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateTeam('team');
          }}
          style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}
        >
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Team name"
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: '200px' }}
          />
          <button type="submit" className="btn-primary" disabled={teamCreating || !newTeamName.trim()}>
            {teamCreating ? 'Creating…' : 'Create team'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={teamCreating || !newTeamName.trim()}
            onClick={() => handleCreateTeam('team-of-teams')}
          >
            {teamCreating ? 'Creating…' : 'Create Team of Teams'}
          </button>
        </form>
        {teams.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No teams yet. Create one above.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {teams.map((team) => (
              <div
                key={team.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {team.name}
                    {team.teamType === 'team-of-teams' && (
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', padding: '2px 8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
                        Team of Teams
                      </span>
                    )}
                  </h3>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleDeleteTeam(team.id)}
                    style={{ fontSize: '13px' }}
                  >
                    Delete team
                  </button>
                </div>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                  Members: {team.memberIds.length === 0 ? 'None' : team.memberIds.map((uid) => resolveMemberName(uid)).join(', ')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#374151' }}>Add member:</span>
                  <select
                    value=""
                    onChange={(e) => {
                      const uid = e.target.value;
                      if (uid) handleAddTeamMember(team.id, uid);
                      e.target.value = '';
                    }}
                    style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="">Select user…</option>
                    {companyUsers
                      .filter((u) => !team.memberIds.includes(u.uid))
                      .map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.displayName || u.email}
                        </option>
                      ))}
                  </select>
                  {team.memberIds.map((uid) => (
                    <span key={uid} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#e5e7eb', borderRadius: '6px', fontSize: '13px' }}>
                      {resolveMemberName(uid)}
                      <button
                        type="button"
                        onClick={() => handleRemoveTeamMember(team.id, uid)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#6b7280', fontSize: '14px' }}
                        title="Remove from team"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  );
};

export default InviteUserPage;
