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
import { getAuth, getDataStore } from './lib/adapters';
import { mergeProfileForBackfill } from './lib/firestore';
import { mockWorkItems, mockSprints, mockBoards, mockUsers, mockTenantCompanies, SEED_TENANT_ID } from './utils/mockData';
import RegisterCompanyPage from './pages/RegisterCompanyPage';
import PublicLandingPage from './pages/PublicLandingPage';
import InviteUserPage from './pages/InviteUserPage';
import LicencePage from './pages/LicencePage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import SettingsPage from './pages/SettingsPage';
import ImportBacklogPage from './pages/ImportBacklogPage';
import UserProfilePage from './pages/UserProfilePage';
import ChangePasswordRequired from './components/ChangePasswordRequired';
import './App.css';

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
    setFirebaseUser,
    currentTenantId,
    firebaseUser,
    tenantCompanies,
    mustChangePassword,
    setMustChangePassword,
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
          const tenantId = profile.companyId ?? SEED_TENANT_ID;
          const roles = profile.companies?.find((c) => c.companyId === tenantId)?.roles ?? [];
          setCurrentTenantId(tenantId);
          setCurrentUser({
            id: profile.uid,
            name: profile.displayName,
            email: profile.email,
            roles,
          });
          setMustChangePassword(profile.mustChangePassword === true);
          const merged = mergeProfileForBackfill(profile, tenantId, roles);
          try {
            await getDataStore().setUserProfile(merged);
          } catch (err) {
            console.error('[App] Backfill setUserProfile failed:', err);
            try {
              await getDataStore().setUserProfile(merged);
            } catch (retryErr) {
              console.error('[App] Backfill setUserProfile retry failed:', retryErr);
            }
          }
        } else {
          setMustChangePassword(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCurrentTenantId(SEED_TENANT_ID);
        setCurrentUser({
          id: firebaseUser.uid,
          name: (firebaseUser.displayName ?? firebaseUser.email?.split('@')[0]) ?? 'User',
          email: firebaseUser.email ?? '',
          roles: [],
        });
        setMustChangePassword(false);
      });
    return () => { cancelled = true; };
  }, [firebaseUser?.uid, setCurrentTenantId, setCurrentUser, setMustChangePassword]);

  // Load tenant companies only when auth is configured and user is signed in,
  // so incognito/fresh sessions load companies after login instead of before (when auth would fail).
  useEffect(() => {
    if (!getAuth().isConfigured()) {
      setTenantCompanies(mockTenantCompanies);
      setCurrentTenantId(SEED_TENANT_ID);
      setWorkItems(mockWorkItems);
      setSprints(mockSprints);
      setBoards(mockBoards);
      setUsers(mockUsers);
      setCurrentUser(mockUsers[0]);
      return;
    }
    if (!firebaseUser) {
      setTenantCompanies([]);
      setCurrentTenantId(null);
      return;
    }
    const uid = firebaseUser.uid;
    getDataStore()
      .getTenantCompanies()
      .then((companies) => {
        setTenantCompanies(companies);
        if (companies.length > 0) {
          const first = companies[0].id;
          const current = useStore.getState().currentTenantId;
          const currentInList = current && companies.some((c) => c.id === current);
          if (currentInList) {
            setCurrentTenantId(current);
            return;
          }
          getDataStore()
            .getUserProfile(uid)
            .then((profile) => {
              const preferred =
                profile?.companyId && companies.some((c) => c.id === profile.companyId)
                  ? profile.companyId
                  : first;
              setCurrentTenantId(preferred);
            })
            .catch(() => setCurrentTenantId(first));
        } else {
          setCurrentTenantId(SEED_TENANT_ID);
          setWorkItems(mockWorkItems);
        }
      })
      .catch((err) => {
        console.error('[Firebase] Load tenant companies failed, using mock:', err?.message || err);
        setTenantCompanies(mockTenantCompanies);
        setCurrentTenantId(SEED_TENANT_ID);
        setWorkItems(mockWorkItems);
        setSprints(mockSprints);
        setBoards(mockBoards);
        setUsers(mockUsers);
        setCurrentUser(mockUsers[0]);
      });
  }, [firebaseUser?.uid, setTenantCompanies, setCurrentTenantId, setWorkItems, setSprints, setBoards, setUsers, setCurrentUser]);

  useEffect(() => {
    if (!currentTenantId) return;
    if (!getAuth().isConfigured()) return;
    getDataStore().getWorkItems(currentTenantId)
      .then((data) => {
        setWorkItems(data);
        if (import.meta.env.DEV) console.log('[Firebase] Loaded', data.length, 'work items for tenant', currentTenantId);
      })
      .catch((err) => {
        console.error('[Firebase] Load work items failed, using mock data:', err?.message || err);
        setWorkItems(mockWorkItems.filter((i) => i.companyId === currentTenantId));
      });
  }, [currentTenantId, setWorkItems]);

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
      case 'backlog':
        return <ProductBacklog />;
      case 'list':
        return <WorkItemList />;
      case 'epic':
        return <EpicBoard />;
      case 'feature':
        return <FeatureBoard />;
      case 'team':
        return <TeamBoard />;
      case 'invite-user':
        return <InviteUserPage />;
      case 'licence':
        return <LicencePage />;
      case 'company-profile':
        return <CompanyProfilePage />;
      case 'settings':
        return <SettingsPage />;
      case 'import-backlog':
        return <ImportBacklogPage />;
      case 'user-profile':
        return <UserProfilePage />;
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

  return (
    <div className="app">
      <Navigation />
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
