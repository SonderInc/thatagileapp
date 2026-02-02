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
import { mockWorkItems, mockSprints, mockBoards, mockUsers, mockTenantCompanies, SEED_TENANT_ID } from './utils/mockData';
import Login from './pages/Login';
import RegisterCompanyPage from './pages/RegisterCompanyPage';
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
  } = useStore();

  useEffect(() => {
    const auth = getAuth();
    return auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
    });
  }, [setFirebaseUser]);

  useEffect(() => {
    if (!firebaseUser || !getAuth().isConfigured()) return;
    getDataStore().getUserProfile(firebaseUser.uid)
      .then((profile) => {
        if (profile) {
          setCurrentTenantId(profile.companyId ?? SEED_TENANT_ID);
          setCurrentUser({
            id: profile.uid,
            name: profile.displayName,
            email: profile.email,
            roles: profile.companies?.find((c) => c.companyId === (profile.companyId ?? SEED_TENANT_ID))?.roles ?? [],
          });
        }
      })
      .catch(() => {
        setCurrentTenantId(SEED_TENANT_ID);
        setCurrentUser({
          id: firebaseUser.uid,
          name: (firebaseUser.displayName ?? firebaseUser.email?.split('@')[0]) ?? 'User',
          email: firebaseUser.email ?? '',
          roles: [],
        });
      });
  }, [firebaseUser?.uid, setCurrentTenantId, setCurrentUser]);

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
    getDataStore().getTenantCompanies()
      .then((companies) => {
        setTenantCompanies(companies);
        if (companies.length > 0) {
          const first = companies[0].id;
          const current = useStore.getState().currentTenantId;
          setCurrentTenantId(current ?? first);
        } else {
          setCurrentTenantId(SEED_TENANT_ID);
          setWorkItems(mockWorkItems);
        }
      })
      .catch((err) => {
        console.error('[Firebase] Load tenant companies failed, using mock:', err?.message || err);
        setTenantCompanies(mockTenantCompanies);
        setCurrentTenantId(SEED_TENANT_ID);
      });
    setSprints(mockSprints);
    setBoards(mockBoards);
    setUsers(mockUsers);
    setCurrentUser(mockUsers[0]);
  }, [setTenantCompanies, setCurrentTenantId, setWorkItems, setSprints, setBoards, setUsers, setCurrentUser]);

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
      default:
        return <Landing />;
    }
  };

  const firebaseReady = getAuth().isConfigured();

  if (firebaseReady && firebaseUser === null) {
    return (
      <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <Login />
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
