import React, { useState, useRef, useEffect } from 'react';
import { getAuth } from '../lib/adapters';
import { useStore } from '../store/useStore';
import { LayoutDashboard, Layers, Package, Users, List, ListOrdered, Home, LogOut, Shield } from 'lucide-react';

const Navigation: React.FC = () => {
  const { viewMode, setViewMode, setSelectedProductId, firebaseUser, setFirebaseUser, setCurrentUser, setCurrentTenantId, currentUser } = useStore();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.roles?.includes('admin') ?? false;
  const isHR = currentUser?.roles?.includes('hr') ?? false;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    const auth = getAuth();
    auth.signOut().then(() => {
      setFirebaseUser(null);
      setCurrentUser(null);
      setCurrentTenantId(null);
    });
  };

  const navItems = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'backlog', label: 'Product Backlog', icon: List },
    { id: 'list', label: 'Work Items', icon: ListOrdered },
    { id: 'epic', label: 'Epic Board', icon: Layers },
    { id: 'feature', label: 'Feature Board', icon: Package },
    { id: 'team', label: 'Team Board', icon: Users },
  ];

  const handleNavClick = (id: string) => {
    setViewMode(id as typeof viewMode);
    if (id === 'landing') setSelectedProductId(null);
    if (id === 'backlog') setSelectedProductId(null);
  };

  const adminItems = [
    { id: 'invite-user', label: 'User Management' },
    { id: 'licence', label: 'Licence' },
    { id: 'company-profile', label: 'Company profile' },
    { id: 'settings', label: 'Settings' },
  ] as const;

  const visibleAdminItems = isAdmin
    ? adminItems
    : isHR
      ? adminItems.filter((a) => a.id === 'invite-user')
      : [];

  const handleAdminItem = (id: typeof adminItems[number]['id']) => {
    setViewMode(id);
    setAdminMenuOpen(false);
  };

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
            onClick={() => handleNavClick(item.id)}
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
      {(isAdmin || isHR) && (
        <div ref={adminMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setAdminMenuOpen((o) => !o)}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: visibleAdminItems.some((a) => viewMode === a.id) ? '3px solid #3b82f6' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: visibleAdminItems.some((a) => viewMode === a.id) ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: visibleAdminItems.some((a) => viewMode === a.id) ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Shield size={18} />
            Admin
          </button>
          {adminMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 0,
                minWidth: '180px',
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 1000,
                padding: '4px 0',
              }}
            >
              {visibleAdminItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAdminItem(item.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    border: 'none',
                    backgroundColor: viewMode === item.id ? '#eff6ff' : 'transparent',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {firebaseUser && (
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            marginLeft: 'auto',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          <LogOut size={18} />
          Sign out
        </button>
      )}
    </nav>
  );
};

export default Navigation;
