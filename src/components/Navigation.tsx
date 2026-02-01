import React from 'react';
import { useStore } from '../store/useStore';
import { LayoutDashboard, Layers, Package, Users, List } from 'lucide-react';

const Navigation: React.FC = () => {
  const { viewMode, setViewMode } = useStore();

  const navItems = [
    { id: 'backlog', label: 'Product Backlog', icon: List },
    { id: 'epic', label: 'Epic Board', icon: Layers },
    { id: 'feature', label: 'Feature Board', icon: Package },
    { id: 'team', label: 'Team Board', icon: Users },
  ];

  return (
    <nav style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginRight: '32px',
      }}>
        <LayoutDashboard size={24} color="#3b82f6" />
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
          thatagileapp.com
        </h2>
      </div>
      
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = viewMode === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => setViewMode(item.id as typeof viewMode)}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: isActive ? '3px solid #3b82f6' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: isActive ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Icon size={18} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
