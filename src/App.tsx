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
import { getWorkItems } from './lib/firestore';
import { isFirebaseConfigured } from './lib/firebase';
import { mockWorkItems, mockSprints, mockBoards, mockUsers } from './utils/mockData';
import './App.css';

function App() {
  const {
    viewMode,
    setWorkItems,
    setSprints,
    setBoards,
    setUsers,
    setCurrentUser,
  } = useStore();

  useEffect(() => {
    getWorkItems()
      .then((data) => {
        setWorkItems(data);
        if (import.meta.env.DEV) console.log('[Firebase] Loaded', data.length, 'work items from Firestore');
      })
      .catch((err) => {
        console.error('[Firebase] Load failed, using mock data:', err?.message || err);
        setWorkItems(mockWorkItems);
      });
    setSprints(mockSprints);
    setBoards(mockBoards);
    setUsers(mockUsers);
    setCurrentUser(mockUsers[0]);
  }, [setWorkItems, setSprints, setBoards, setUsers, setCurrentUser]);

  const renderBoard = () => {
    switch (viewMode) {
      case 'landing':
        return <Landing />;
      case 'add-product':
        return <AddProductPage />;
      case 'add-company':
        return <AddCompanyPage />;
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

  const firebaseReady = isFirebaseConfigured();

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
