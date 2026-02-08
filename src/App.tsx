import { useEffect } from 'react';
import { useStore } from './store/useStore';
import Navigation from './components/Navigation';
import Landing from './pages/Landing';
import AddProductPage from './pages/AddProductPage';
import AddCompanyPage from './pages/AddCompanyPage';
import ProductBacklog from './pages/ProductBacklog';
import WorkItemList from './pages/WorkItemList';
import EpicBoard from './pages/EpicBoard';
import FeatureBoard from './pages/FeatureBoard';
import TeamBoard from './pages/TeamBoard';
import TeamsListPage from './pages/TeamsListPage';
import { getAuth, getDataStore } from './lib/adapters';
import { ensureTenantAccess } from './services/tenantMembershipService';
import { isAdminForCompany } from './lib/roles';
import { getFirebaseProjectId } from './lib/firebase';
import { mockWorkItems, mockSprints, mockBoards, mockUsers, mockTenantCompanies, SEED_TENANT_ID, isSeedEnabled } from './utils/mockData';
import RegisterCompanyPage from './pages/RegisterCompanyPage';
import PublicLandingPage from './pages/PublicLandingPage';
import InviteUserPage from './pages/InviteUserPage';
import LicencePage from './pages/LicencePage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import SettingsPage from './pages/SettingsPage';
import NomenclaturePage from './pages/NomenclaturePage';
import TerminologySettingsPage from './pages/settings/TerminologySettingsPage';
import ProductHierarchySettingsPage from './pages/settings/ProductHierarchySettingsPage';
import TeamBoardSettingsListPage from './pages/TeamBoardSettingsListPage';
import FeatureBoardSettingsPage from './pages/FeatureBoardSettingsPage';
import EpicBoardSettingsPage from './pages/EpicBoardSettingsPage';
import ImportBacklogPage from './pages/ImportBacklogPage';
import UserProfilePage from './pages/UserProfilePage';
import NoCompanyPage from './pages/NoCompanyPage';
import PlanningBoardPage from './pages/PlanningBoardPage';
import BoardsDirectoryPage from './pages/BoardsDirectoryPage';
import AppAdminPage from './pages/AppAdminPage';
import ChangePasswordRequired from './components/ChangePasswordRequired';
import type { Role } from './types';
import './App.css';

/** Compact bar shown when app is embedded via ?embed=1: logo + "Open in new tab". */
function EmbedStrip() {
  const { tenantCompanies, currentTenantId } = useStore();
  const currentCompany = tenantCompanies.find((c) => c.id === currentTenantId) ?? null;
  const openUrl =
    typeof window !== 'undefined'
      ? (() => {
          const u = new URL(window.location.href);
          u.searchParams.delete('embed');
          return u.toString();
        })()
      : '#';
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      {currentCompany?.logoUrl && (
        <img
          src={currentCompany.logoUrl}
          alt=""
          style={{ maxHeight: '32px', width: 'auto', objectFit: 'contain' }}
        />
      )}
      <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827', flex: 1 }}>
        {currentCompany?.name ?? 'Backlog'}
      </span>
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '14px',
          color: '#3b82f6',
          fontWeight: '500',
          textDecoration: 'none',
        }}
      >
        Open in new tab
      </a>
    </div>
  );
}

function App() {
  const {
    viewMode,
    setWorkItems,
    setSprints,
    setBoards,
    setUsers,
    setCurrentUser,
    setTenantCompanies,
    setCurrentTenantId,
    setViewMode,
    setFirebaseUser,
    currentTenantId,
    currentUser,
    firebaseUser,
    tenantCompanies,
    mustChangePassword,
    setMustChangePassword,
    loadPlanningBoards,
    loadTerminology,
  } = useStore();

  useEffect(() => {
    const auth = getAuth();
    return auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
      if (!user) setMustChangePassword(false);
    });
  }, [setFirebaseUser, setMustChangePassword]);

  useEffect(() => {
    if (!firebaseUser || !getAuth().isConfigured()) return;
    let cancelled = false;
    getDataStore().getUserProfile(firebaseUser.uid)
      .then(async (profile) => {
        if (cancelled) return;
        if (profile) {
          const uid = firebaseUser.uid;
          const tenantId =
            profile.companyId ??
            profile.companyIds?.[0] ??
            profile.companies?.[0]?.companyId ??
            (isSeedEnabled() ? SEED_TENANT_ID : null);
          if (tenantId === SEED_TENANT_ID && import.meta.env.DEV) {
            console.warn('[App] Seed fallback active (no company in profile)', { uid, profileCompanyId: profile.companyId });
          }
          if (tenantId == null) {
            if (useStore.getState().currentTenantId != null) {
              return;
            }
            setCurrentTenantId(null);
            setCurrentUser({
              id: profile.uid,
              name: profile.displayName,
              email: profile.email,
              roles: [],
              appAdmin: profile.appAdmin ?? false,
            });
            setMustChangePassword(profile.mustChangePassword === true);
            setViewMode('no-company');
          } else {
            const tenantCompanyId = tenantId;
            const derivedRolesForTenant =
              profile.companies?.find((c) => c.companyId === tenantCompanyId)?.roles ?? [];
            const isAdmin = isAdminForCompany(profile, tenantCompanyId);
            const finalRoles =
              isAdmin && !derivedRolesForTenant.includes('admin')
                ? ['admin', ...derivedRolesForTenant]
                : derivedRolesForTenant;
            if (import.meta.env.DEV) {
              if (isAdmin && !finalRoles.includes('admin')) {
                console.error('[App] Invariant: isAdmin true but finalRoles missing admin', {
                  tenantCompanyId,
                  isAdmin,
                  finalRoles,
                });
              }
              console.log('[App] Profile load (admin/tenant diagnostics)', {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                'profile.companyId': profile.companyId,
                'profile.companyIds': profile.companyIds,
                'profile.adminCompanyIds': profile.adminCompanyIds,
                tenantId: tenantCompanyId,
                isAdminForCompany: isAdmin,
                finalRoles,
              });
            }
            setCurrentTenantId(tenantCompanyId);
            setCurrentUser({
              id: profile.uid,
              name: profile.displayName,
              email: profile.email,
              roles: finalRoles as Role[],
              appAdmin: profile.appAdmin ?? false,
            });
            setMustChangePassword(profile.mustChangePassword === true);
            if (useStore.getState().viewMode === 'no-company') {
              setViewMode('landing');
            }
          }
        } else {
          if (import.meta.env.DEV) {
            console.warn('[App] Profile missing (user doc may not exist or wrong project)', {
              uid: firebaseUser.uid,
              projectId: getFirebaseProjectId(),
            });
          }
          setMustChangePassword(false);
          if (isSeedEnabled()) {
            setCurrentTenantId(SEED_TENANT_ID);
            setCurrentUser({
              id: firebaseUser.uid,
              name: (firebaseUser.displayName ?? firebaseUser.email?.split('@')[0]) ?? 'User',
              email: firebaseUser.email ?? '',
              roles: [],
              appAdmin: false,
            });
            if (import.meta.env.DEV) {
              console.warn('[App] Seed fallback active (profile null)', { uid: firebaseUser.uid });
            }
          } else {
            setCurrentTenantId(null);
            setCurrentUser({
              id: firebaseUser.uid,
              name: (firebaseUser.displayName ?? firebaseUser.email?.split('@')[0]) ?? 'User',
              email: firebaseUser.email ?? '',
              roles: [],
              appAdmin: false,
            });
            setViewMode('no-company');
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.warn('[App] Profile load failed', {
            uid: firebaseUser.uid,
            projectId: getFirebaseProjectId(),
          });
        }
        if (isSeedEnabled()) {
          setCurrentTenantId(SEED_TENANT_ID);
          setCurrentUser({
            id: firebaseUser.uid,
            name: (firebaseUser.displayName ?? firebaseUser.email?.split('@')[0]) ?? 'User',
            email: firebaseUser.email ?? '',
            roles: [],
            appAdmin: false,
          });
          if (import.meta.env.DEV) {
            console.warn('[App] Seed fallback active (profile load failed)', { uid: firebaseUser.uid });
          }
        } else {
          setCurrentTenantId(null);
          setCurrentUser({
            id: firebaseUser.uid,
            name: (firebaseUser.displayName ?? firebaseUser.email?.split('@')[0]) ?? 'User',
            email: firebaseUser.email ?? '',
            roles: [],
            appAdmin: false,
          });
          setViewMode('account-load-failed');
        }
        setMustChangePassword(false);
      });
    return () => { cancelled = true; };
  }, [firebaseUser?.uid, setCurrentTenantId, setCurrentUser, setMustChangePassword, setViewMode]);

  // Load tenant companies only when auth is configured and user is signed in,
  // so incognito/fresh sessions load companies after login instead of before (when auth would fail).
  useEffect(() => {
    if (!getAuth().isConfigured()) {
      if (isSeedEnabled()) {
        setTenantCompanies(mockTenantCompanies);
        setCurrentTenantId(SEED_TENANT_ID);
        setWorkItems(mockWorkItems);
        setSprints(mockSprints);
        setBoards(mockBoards);
        setUsers(mockUsers);
        setCurrentUser({ ...mockUsers[0], appAdmin: false });
        if (import.meta.env.DEV) console.warn('[App] Seed fallback active (auth not configured)');
      } else {
        setTenantCompanies([]);
        setCurrentTenantId(null);
      }
      return;
    }
    if (!firebaseUser) {
      setTenantCompanies([]);
      setCurrentTenantId(null);
      return;
    }
    const uid = firebaseUser.uid;
    const store = getDataStore();
    store
      .getUserProfile(uid)
      .then(async (profile) => {
        const ids = profile?.companyIds ?? (profile?.companyId ? [profile.companyId] : []);
        if (ids.length > 0) return store.getTenantCompaniesByIds(ids);
        const tenantId = profile?.companyId ?? profile?.companyIds?.[0] ?? profile?.companies?.[0]?.companyId;
        if (tenantId) {
          await ensureTenantAccess(tenantId);
          return store.getTenantCompaniesByIds([tenantId]);
        }
        return store.getTenantCompanies();
      })
      .then((companies) => {
        setTenantCompanies(companies);
        if (companies.length > 0) {
          const first = companies[0].id;
          const current = useStore.getState().currentTenantId;
          const currentInList = current && companies.some((c) => c.id === current);
          const applyTenant = (tenantId: string) => {
            setCurrentTenantId(tenantId);
            if (useStore.getState().viewMode === 'no-company') {
              setViewMode('landing');
            }
          };
          if (currentInList) {
            applyTenant(current);
            getDataStore()
              .getUserProfile(uid)
              .then((profile) => {
                if (profile) {
                  const derived = profile.companies?.find((c) => c.companyId === current)?.roles ?? [];
                  const isAdmin = isAdminForCompany(profile, current);
                  const roles = isAdmin && !derived.includes('admin') ? ['admin', ...derived] : derived;
                  const state = useStore.getState();
                  if (state.currentUser?.id === uid && (state.currentUser.roles ?? []).join(',') !== roles.join(',')) {
                    setCurrentUser({ ...state.currentUser, roles: roles as Role[] });
                  }
                }
              })
              .catch(() => {});
            return;
          }
          getDataStore()
            .getUserProfile(uid)
            .then((profile) => {
              const preferred =
                profile?.companyId && companies.some((c) => c.id === profile.companyId)
                  ? profile.companyId
                  : first;
              applyTenant(preferred);
              if (profile) {
                const derived = profile.companies?.find((c) => c.companyId === preferred)?.roles ?? [];
                const isAdmin = isAdminForCompany(profile, preferred);
                const roles = isAdmin && !derived.includes('admin') ? ['admin', ...derived] : derived;
                const state = useStore.getState();
                if (state.currentUser && state.currentUser.id === uid) {
                  const currentRoles = state.currentUser.roles ?? [];
                  if (currentRoles.join(',') !== roles.join(',')) {
                    setCurrentUser({ ...state.currentUser, roles: roles as Role[] });
                  }
                }
              }
            })
            .catch(() => applyTenant(first));
        } else {
          if (isSeedEnabled()) {
            setCurrentTenantId(SEED_TENANT_ID);
            setWorkItems(mockWorkItems);
            if (import.meta.env.DEV) console.warn('[App] Seed fallback active (no companies from Firestore)', { uid });
          } else {
            getDataStore()
              .getUserProfile(uid)
              .then((profile) => {
                if (!profile) {
                  setCurrentTenantId(null);
                  setViewMode('no-company');
                  return;
                }
                const tenantId =
                  profile.companyId ??
                  profile.companyIds?.[0] ??
                  profile.companies?.[0]?.companyId ??
                  null;
                if (tenantId != null) {
                  if (import.meta.env.DEV) {
                    console.warn('[App] Companies list empty but profile has tenant; setting from profile and backfilling', { uid, tenantId });
                  }
                  const derivedRoles =
                    profile.companies?.find((c) => c.companyId === tenantId)?.roles ?? [];
                  const isAdmin = isAdminForCompany(profile, tenantId);
                  const roles = (isAdmin && !derivedRoles.includes('admin') ? ['admin', ...derivedRoles] : derivedRoles) as Role[];
                  setCurrentTenantId(tenantId);
                  setCurrentUser({
                    id: profile.uid,
                    name: profile.displayName,
                    email: profile.email,
                    roles,
                    appAdmin: profile.appAdmin ?? false,
                  });
                  if (useStore.getState().viewMode === 'no-company') {
                    setViewMode('landing');
                  }
                  return ensureTenantAccess(tenantId)
                    .then(() => getDataStore().getTenantCompanies())
                    .then((companies2) => {
                      setTenantCompanies(companies2);
                    });
                } else {
                  setCurrentTenantId(null);
                  setViewMode('no-company');
                }
              })
              .catch((err) => {
                if (import.meta.env.DEV) console.error('[App] Profile load when companies empty failed:', err);
                if (useStore.getState().currentTenantId == null) {
                  setCurrentTenantId(null);
                  setViewMode('account-load-failed');
                }
              });
          }
        }
      })
      .catch((err) => {
        const msg = err?.message || String(err);
        console.error('[Firebase] Load tenant companies failed:', msg);
        if (msg.includes('permission') || msg.includes('insufficient') || msg.includes('Permission')) {
          if (import.meta.env.DEV) {
            console.warn('[Firebase] Permissions hint: ensure Firestore has a document at users/' + uid + ' with a companyIds array. If using Settings → "my database", deploy firestore.rules to that project and ensure the user exists there.');
          }
        }
        if (isSeedEnabled()) {
          setTenantCompanies(mockTenantCompanies);
          setCurrentTenantId(SEED_TENANT_ID);
          setWorkItems(mockWorkItems);
          setSprints(mockSprints);
          setBoards(mockBoards);
          setUsers(mockUsers);
          setCurrentUser({ ...mockUsers[0], appAdmin: false });
          if (import.meta.env.DEV) console.warn('[App] Seed fallback active (load tenant companies failed)', { uid });
        } else {
          setTenantCompanies([]);
          const hasTenant = useStore.getState().currentTenantId != null;
          if (hasTenant) {
            if (import.meta.env.DEV) {
              console.warn('[App] Load tenant companies failed but profile has tenant; preserving tenant and attempting backfill', { uid });
            }
            ensureTenantAccess(useStore.getState().currentTenantId!)
              .then(() => getDataStore().getTenantCompanies())
              .then((companies2) => {
                setTenantCompanies(companies2);
              })
              .catch((backfillErr) => {
                if (import.meta.env.DEV) console.error('[App] ensureTenantAccess or getTenantCompanies failed:', backfillErr);
              });
          } else {
            getDataStore()
              .getUserProfile(uid)
              .then((profile) => {
                if (!profile) {
                  setCurrentTenantId(null);
                  setViewMode('no-company');
                  return;
                }
                const tenantId =
                  profile.companyId ??
                  profile.companyIds?.[0] ??
                  profile.companies?.[0]?.companyId ??
                  null;
                if (tenantId != null) {
                  if (import.meta.env.DEV) {
                    console.warn('[App] getTenantCompanies failed but profile has tenant; setting from profile and backfilling', { uid, tenantId });
                  }
                  const derivedRoles =
                    profile.companies?.find((c) => c.companyId === tenantId)?.roles ?? [];
                  const isAdmin = isAdminForCompany(profile, tenantId);
                  const roles = (isAdmin && !derivedRoles.includes('admin') ? ['admin', ...derivedRoles] : derivedRoles) as Role[];
                  setCurrentTenantId(tenantId);
                  setCurrentUser({
                    id: profile.uid,
                    name: profile.displayName,
                    email: profile.email,
                    roles,
                    appAdmin: profile.appAdmin ?? false,
                  });
                  if (useStore.getState().viewMode === 'no-company') {
                    setViewMode('landing');
                  }
                  return ensureTenantAccess(tenantId)
                    .then(() => getDataStore().getTenantCompanies())
                    .then((companies2) => {
                      setTenantCompanies(companies2);
                    });
                } else {
                  setCurrentTenantId(null);
                  setViewMode('no-company');
                }
              })
              .catch(() => {
                setCurrentTenantId(null);
                setViewMode('account-load-failed');
              });
          }
        }
      });
  }, [firebaseUser?.uid, setTenantCompanies, setCurrentTenantId, setWorkItems, setSprints, setBoards, setUsers, setCurrentUser, setViewMode]);

  useEffect(() => {
    if (!currentTenantId) return;
    if (!getAuth().isConfigured()) return;
    getDataStore().getWorkItems(currentTenantId)
      .then((data) => {
        setWorkItems(data);
        if (import.meta.env.DEV) console.log('[Firebase] Loaded', data.length, 'work items for tenant', currentTenantId);
      })
      .catch((err) => {
        console.error('[Firebase] Load work items failed:', err?.message || err);
        const fallback = mockWorkItems.filter((i) => i.companyId === currentTenantId);
        if (fallback.length > 0) setWorkItems(fallback);
      });
  }, [currentTenantId, setWorkItems]);

  useEffect(() => {
    if (!currentTenantId || !getAuth().isConfigured()) return;
    loadTerminology(currentTenantId);
  }, [currentTenantId, loadTerminology]);

  useEffect(() => {
    if (!currentTenantId || !getAuth().isConfigured()) return;
    if (!firebaseUser || !currentUser) return;
    if (viewMode === 'planning') return;
    const run = async () => {
      try {
        await ensureTenantAccess(currentTenantId);
      } catch (err) {
        console.error('[App] ensureTenantAccess failed', err);
        return;
      }
      await loadPlanningBoards(currentTenantId).catch((err) =>
        console.error('[App] Load planning boards failed:', err?.message || err)
      );
    };
    run();
  }, [currentTenantId, firebaseUser, currentUser, loadPlanningBoards, viewMode]);

  useEffect(() => {
    if (!firebaseUser || !tenantCompanies.length) return;
    const pathSlug = typeof window !== 'undefined' ? window.location.pathname.slice(1).split('/')[0] : '';
    if (pathSlug) {
      const tenant = tenantCompanies.find((c) => c.slug === pathSlug);
      if (tenant) {
        if (useStore.getState().currentTenantId !== tenant.id) {
          setCurrentTenantId(tenant.id);
        }
      } else {
        const first = tenantCompanies[0];
        setCurrentTenantId(first.id);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/' + first.slug);
        }
      }
    } else {
      const current = tenantCompanies.find((c) => c.id === currentTenantId) ?? tenantCompanies[0];
      if (current && typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/' + current.slug);
      }
    }
  }, [firebaseUser, tenantCompanies, currentTenantId, setCurrentTenantId]);

  const renderBoard = () => {
    switch (viewMode) {
      case 'landing':
        return <Landing />;
      case 'add-product':
        return <AddProductPage />;
      case 'add-company':
        return <AddCompanyPage />;
      case 'register-company':
        return <RegisterCompanyPage />;
      case 'no-company':
      case 'account-load-failed':
        return <NoCompanyPage />;
      case 'backlog':
        return <ProductBacklog />;
      case 'list':
        return <WorkItemList />;
      case 'epic':
        return <EpicBoard />;
      case 'feature':
        return <FeatureBoard />;
      case 'planning':
        return <PlanningBoardPage />;
      case 'boards-directory':
        return <BoardsDirectoryPage />;
      case 'teams-list':
        return <TeamsListPage />;
      case 'team':
        return <TeamBoard />;
      case 'invite-user':
        return <InviteUserPage />;
      case 'licence':
        return <LicencePage />;
      case 'company-profile':
        return <CompanyProfilePage />;
      case 'company-settings':
        return <CompanySettingsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'nomenclature':
        return <NomenclaturePage />;
      case 'terminology':
        return <TerminologySettingsPage />;
      case 'product-hierarchy':
        return <ProductHierarchySettingsPage />;
      case 'team-board-settings':
        return <TeamBoardSettingsListPage />;
      case 'feature-board-settings':
        return <FeatureBoardSettingsPage />;
      case 'epic-board-settings':
        return <EpicBoardSettingsPage />;
      case 'import-backlog':
        return <ImportBacklogPage />;
      case 'user-profile':
        return <UserProfilePage />;
      case 'app-admin':
        return <AppAdminPage />;
      default:
        return <Landing />;
    }
  };

  const firebaseReady = getAuth().isConfigured();

  if (firebaseReady && firebaseUser === null) {
    return (
      <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <PublicLandingPage />
      </div>
    );
  }

  if (firebaseReady && firebaseUser && mustChangePassword) {
    return (
      <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <ChangePasswordRequired />
      </div>
    );
  }

  const showProductionPersistenceNotice =
    !import.meta.env.DEV && !firebaseReady;

  const isEmbed =
    typeof window !== 'undefined' &&
    /^(true|1)$/i.test(new URLSearchParams(window.location.search).get('embed') ?? '');

  if (viewMode === 'no-company' || viewMode === 'account-load-failed') {
    return (
      <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <NoCompanyPage />
      </div>
    );
  }

  return (
    <div className="app">
      {isEmbed ? <EmbedStrip /> : <Navigation />}
      {showProductionPersistenceNotice && (
        <div
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            color: '#92400e',
            backgroundColor: '#fef3c7',
            borderBottom: '1px solid #e5e7eb',
            textAlign: 'center',
          }}
        >
          Data is not saved. Set Firebase env vars (VITE_FIREBASE_*) in your host to persist work items.
        </div>
      )}
      <main style={{ backgroundColor: '#f9fafb', minHeight: 'calc(100vh - 60px)' }}>
        {renderBoard()}
      </main>
      {import.meta.env.DEV && (
        <div
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            color: firebaseReady ? '#059669' : '#b45309',
            backgroundColor: firebaseReady ? '#d1fae5' : '#fef3c7',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          {firebaseReady
            ? 'Backlog: Firestore (data persists)'
            : 'Backlog: Demo data — add .env.local with VITE_FIREBASE_* and restart dev server'}
        </div>
      )}
    </div>
  );
}

export default App;
