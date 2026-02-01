import { useEffect } from 'react';
import { useStore } from './store/useStore';
import Navigation from './components/Navigation';
import Landing from './pages/Landing';
import ProductBacklog from './pages/ProductBacklog';
import WorkItemList from './pages/WorkItemList';
import EpicBoard from './pages/EpicBoard';
import FeatureBoard from './pages/FeatureBoard';
import TeamBoard from './pages/TeamBoard';
import { mockWorkItems, mockSprints, mockBoards, mockUsers } from './utils/mockData';
import './App.css';

function App() {
  const { 
    viewMode, 
    setWorkItems, 
    setSprints, 
    setBoards, 
    setUsers,
    setCurrentUser 
  } = useStore();

  useEffect(() => {
    // Initialize with mock data
    setWorkItems(mockWorkItems);
    setSprints(mockSprints);
    setBoards(mockBoards);
    setUsers(mockUsers);
    setCurrentUser(mockUsers[0]);
  }, [setWorkItems, setSprints, setBoards, setUsers, setCurrentUser]);

  const renderBoard = () => {
    switch (viewMode) {
      case 'landing':
        return <Landing />;
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

  return (
    <div className="app">
      <Navigation />
      <main style={{ backgroundColor: '#f9fafb', minHeight: 'calc(100vh - 60px)' }}>
        {renderBoard()}
      </main>
    </div>
  );
}

export default App;
