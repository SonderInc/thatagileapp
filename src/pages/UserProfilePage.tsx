import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getDataStore } from '../lib/adapters';
import { mergeProfileForBackfill } from '../lib/firestore';
import { isAdminForCompany } from '../lib/roles';
import type { UserProfile } from '../types';
import type { Role } from '../types';

const UserProfilePage: React.FC = () => {
  const { currentUser, firebaseUser, setViewMode, getCurrentCompany, getRoleLabel, setCurrentUser } = useStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const backfillAttempted = useRef(false);

  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    getDataStore()
      .getUserProfile(currentUser.id)
      .then(async (p) => {
        let nextProfile = p ?? null;
        const company = getCurrentCompany();
        const currentTenantId = company?.id ?? nextProfile?.companyId ?? null;
        const rolesForCompany =
          nextProfile?.companies?.find((c) => c.companyId === currentTenantId)?.roles ??
          (nextProfile?.companies?.length === 1 ? nextProfile.companies[0].roles : undefined) ??
          nextProfile?.companies?.find((c) => c.roles?.includes('admin'))?.roles ??
          [];
        if (
          nextProfile &&
          currentTenantId &&
          rolesForCompany.length === 0 &&
          !backfillAttempted.current
        ) {
          backfillAttempted.current = true;
          try {
            const count = await getDataStore().getCompanyUserCount(currentTenantId);
            if (count <= 1) {
              const merged = mergeProfileForBackfill(nextProfile, currentTenantId, ['admin']);
              await getDataStore().setUserProfile(merged);
              nextProfile = { ...nextProfile, companies: merged.companies };
              setCurrentUser({
                ...currentUser,
                roles: merged.companies?.find((c) => c.companyId === currentTenantId)?.roles ?? currentUser.roles ?? [],
              });
            }
          } catch {
            backfillAttempted.current = false;
          }
        }
        if (nextProfile && rolesForCompany.length > 0) {
          let rolesToSet = rolesForCompany;
          if (currentTenantId && isAdminForCompany(nextProfile, currentTenantId) && !rolesToSet.includes('admin')) {
            rolesToSet = ['admin', ...rolesToSet];
          }
          const hasAll = rolesToSet.every((r) => currentUser.roles?.includes(r));
          if (!hasAll) {
            setCurrentUser({ ...currentUser, roles: rolesToSet });
          }
        }
        setProfile(nextProfile);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [currentUser?.id, getCurrentCompany, setCurrentUser]);

  const company = getCurrentCompany();
  const currentTenantId = company?.id ?? profile?.companyId ?? null;
  const rolesForCompany =
    (profile?.companies?.length === 1 ? profile.companies[0].roles : undefined) ??
    profile?.companies?.find((c) => c.companyId === currentTenantId)?.roles ??
    profile?.companies?.find((c) => c.roles?.includes('admin'))?.roles ??
    currentUser?.roles ??
    [];
  const allCompaniesWithRoles = profile?.companies ?? [];

  useEffect(() => {
    if (!currentUser || rolesForCompany.length === 0) return;
    let rolesToSet = rolesForCompany;
    if (profile && currentTenantId && isAdminForCompany(profile, currentTenantId) && !rolesToSet.includes('admin')) {
      rolesToSet = ['admin', ...rolesToSet];
    }
    const hasAll = rolesToSet.every((r) => currentUser.roles?.includes(r));
    if (!hasAll) setCurrentUser({ ...currentUser, roles: rolesToSet });
  }, [currentUser?.id, rolesForCompany.join(','), currentUser?.roles?.join(','), profile, currentTenantId]);

  if (!firebaseUser || !currentUser) {
    return (
      <div className="page-container">
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>Sign in to view your profile.</p>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
          Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: '#6b7280' }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
          Back
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>
          My profile
        </h1>
      </div>

      <div
        style={{
          maxWidth: '480px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '24px',
          backgroundColor: '#fafafa',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
            Name
          </label>
          <div style={{ fontSize: '16px', color: '#111827' }}>{profile?.displayName || currentUser.name || '—'}</div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
            Email
          </label>
          <div style={{ fontSize: '16px', color: '#111827' }}>{profile?.email ?? currentUser.email ?? '—'}</div>
        </div>
        {company && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
              Current company
            </label>
            <div style={{ fontSize: '16px', color: '#111827' }}>{company.name}</div>
          </div>
        )}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
            Roles (this company)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {rolesForCompany.length === 0 ? (
              <span style={{ color: '#9ca3af' }}>—</span>
            ) : (
              rolesForCompany.map((r) => (
                <span
                  key={r}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#e5e7eb',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                >
                  {getRoleLabel(r as Role)}
                </span>
              ))
            )}
          </div>
        </div>
        {allCompaniesWithRoles.length > 1 && (
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
              Other companies
            </label>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', fontSize: '14px' }}>
              {allCompaniesWithRoles
                .filter((c) => c.companyId !== currentTenantId)
                .map((c) => (
                  <li key={c.companyId} style={{ marginBottom: '4px' }}>
                    Company {c.companyId}: {c.roles.map((r) => getRoleLabel(r as Role)).join(', ')}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
