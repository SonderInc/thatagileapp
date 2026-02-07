import React, { useState, useRef, useEffect } from 'react';
import { getAuth } from '../lib/adapters';
import { useStore } from '../store/useStore';
import { LayoutDashboard, Layers, Package, List, ListOrdered, Home, LogOut, Shield, ClipboardList, ChevronDown, Users } from 'lucide-react';

type BoardsModalType = 'planning' | 'epic' | 'feature' | 'team';

const Navigation: React.FC = () => {
  const { viewMode, setViewMode, setSelectedProductId, setSelectedTeamId, selectedTeamId, teams, loadTeams, currentTenantId, tenantCompanies, firebaseUser, setFirebaseUser, setCurrentUser, setCurrentTenantId, currentUser, getTypeLabel, canAccessTeamBoardSettings, planningBoards, loadPlanningBoards, setSelectedPlanningBoardId } = useStore();
  const currentCompany = tenantCompanies.find((c) => c.id === currentTenantId) ?? null;
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [boardsMenuOpen, setBoardsMenuOpen] = useState(false);
  const [boardsModalType, setBoardsModalType] = useState<BoardsModalType | null>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const boardsMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.roles?.includes('admin') ?? false;
  const isHR = currentUser?.roles?.includes('hr') ?? false;
  const isAppAdmin = currentUser?.appAdmin === true;

  useEffect(() => {
    if (currentTenantId) loadTeams(currentTenantId);
  }, [currentTenantId, loadTeams]);

  useEffect(() => {
    if (boardsModalType === 'planning' && currentTenantId) loadPlanningBoards(currentTenantId);
  }, [boardsModalType, currentTenantId, loadPlanningBoards]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
      if (boardsMenuRef.current && !boardsMenuRef.current.contains(e.target as Node)) {
        setBoardsMenuOpen(false);
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
    { id: 'backlog', label: `${getTypeLabel('product')} Backlog`, icon: List },
    { id: 'list', label: 'Work Items', icon: ListOrdered },
  ];

  const boardsMenuItems: { type: BoardsModalType; label: string; icon: typeof ClipboardList }[] = [
    { type: 'planning', label: 'Planning Boards', icon: ClipboardList },
    { type: 'epic', label: 'Epic Boards', icon: Layers },
    { type: 'feature', label: 'Feature Boards', icon: Package },
    { type: 'team', label: 'Team Boards', icon: Users },
  ];

  const isBoardView = viewMode === 'epic' || viewMode === 'feature' || viewMode === 'planning' || viewMode === 'team' || viewMode === 'teams-list';

  const handleNavClick = (id: string) => {
    setViewMode(id as typeof viewMode);
    if (id === 'landing') setSelectedProductId(null);
    if (id === 'backlog') setSelectedProductId(null);
  };

  const openBoardsModal = (type: BoardsModalType) => {
    setBoardsModalType(type);
    setBoardsMenuOpen(false);
  };

  const adminItems = [
    { id: 'invite-user', label: 'User Management' },
    { id: 'import-backlog', label: 'Import Backlog' },
    { id: 'licence', label: 'Licence' },
    { id: 'company-profile', label: 'Company profile' },
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

  const isAdminActive = visibleAdminItems.some((a) => viewMode === a.id) || viewMode === 'settings' || viewMode === 'team-board-settings';

  const avatarInitials = (): string => {
    const name = currentUser?.name?.trim();
    if (name) {
      const parts = name.split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
      return name.slice(0, 2).toUpperCase();
    }
    const email = currentUser?.email ?? '';
    if (email) return email[0].toUpperCase();
    return '?';
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
      <button
        type="button"
        onClick={() => setViewMode('landing')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginRight: '32px',
          padding: '4px 0',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        {currentCompany?.logoUrl ? (
          <img
            src={currentCompany.logoUrl}
            alt={`${currentCompany.name} logo`}
            style={{ maxHeight: '36px', width: 'auto', objectFit: 'contain' }}
          />
        ) : (
          <LayoutDashboard size={24} color="#3b82f6" />
        )}
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
          {currentCompany?.name ?? 'thatagileapp.com'}
        </h2>
      </button>
      
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
      <div ref={boardsMenuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setBoardsMenuOpen((o) => !o)}
          style={{
            padding: '12px 16px',
            border: 'none',
            borderBottom: isBoardView ? '3px solid #3b82f6' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: isBoardView ? '#3b82f6' : '#6b7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: isBoardView ? '600' : '400',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <LayoutDashboard size={18} />
          Boards
          <ChevronDown size={16} style={{ opacity: boardsMenuOpen ? 1 : 0.7 }} />
        </button>
        {boardsMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 0,
              minWidth: '220px',
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 1000,
              padding: '4px 0',
            }}
          >
            {boardsMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => openBoardsModal(item.type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {boardsModalType !== null && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
            }}
            onClick={() => setBoardsModalType(null)}
          >
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                minWidth: '320px',
                maxWidth: '90vw',
                maxHeight: '80vh',
                overflow: 'auto',
                padding: '24px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                  {boardsModalType === 'planning' && 'Planning Boards'}
                  {boardsModalType === 'epic' && 'Epic Boards'}
                  {boardsModalType === 'feature' && 'Feature Boards'}
                  {boardsModalType === 'team' && 'Team Boards'}
                </h2>
                <button
                  type="button"
                  onClick={() => setBoardsModalType(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280', padding: '0 4px' }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {boardsModalType === 'planning' && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {planningBoards.length === 0 ? (
                    <li style={{ padding: '12px 0', color: '#6b7280', fontSize: '14px' }}>No planning boards yet.</li>
                  ) : (
                    planningBoards.map((b) => (
                      <li
                        key={b.id}
                        onClick={() => {
                          setSelectedPlanningBoardId(b.id);
                          setViewMode('planning');
                          setBoardsModalType(null);
                        }}
                        style={{
                          padding: '12px 16px',
                          marginBottom: '4px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: selectedPlanningBoardId === b.id ? '#eff6ff' : '#fff',
                        }}
                      >
                        <span style={{ fontWeight: '600', color: '#111827' }}>{b.name}</span>
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>{b.teamIds.length} teams</span>
                      </li>
                    ))
                  )}
                </ul>
              )}

              {boardsModalType === 'epic' && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  <li
                    onClick={() => {
                      setViewMode('epic');
                      setBoardsModalType(null);
                    }}
                    style={{
                      padding: '12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: viewMode === 'epic' ? '#eff6ff' : '#fff',
                    }}
                  >
                    {getTypeLabel('epic')} Board
                  </li>
                </ul>
              )}

              {boardsModalType === 'feature' && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  <li
                    onClick={() => {
                      setViewMode('feature');
                      setBoardsModalType(null);
                    }}
                    style={{
                      padding: '12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: viewMode === 'feature' ? '#eff6ff' : '#fff',
                    }}
                  >
                    {getTypeLabel('feature')} Board
                  </li>
                </ul>
              )}

              {boardsModalType === 'team' && (
                <>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {teams.length === 0 ? (
                      <li style={{ padding: '12px 0', color: '#6b7280', fontSize: '14px' }}>No teams yet.</li>
                    ) : (
                      teams.map((team) => (
                        <li
                          key={team.id}
                          onClick={() => {
                            setSelectedTeamId(team.id);
                            setViewMode('team');
                            setBoardsModalType(null);
                          }}
                          style={{
                            padding: '12px 16px',
                            marginBottom: '4px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: viewMode === 'team' && team.id === selectedTeamId ? '#eff6ff' : '#fff',
                          }}
                        >
                          {team.name}
                        </li>
                      ))
                    )}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeamId(null);
                      setViewMode('teams-list');
                      setBoardsModalType(null);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: '16px',
                      padding: '10px 16px',
                      textAlign: 'left',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      backgroundColor: viewMode === 'teams-list' ? '#eff6ff' : '#fff',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Manage teams
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {(isAdmin || isHR) && (
        <div ref={adminMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setAdminMenuOpen((o) => !o)}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: isAdminActive ? '3px solid #3b82f6' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: isAdminActive ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isAdminActive ? '600' : '400',
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
              {canAccessTeamBoardSettings() && (
                <>
                  <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />
                  <div style={{ padding: '6px 16px 4px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Board Settings
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('team-board-settings');
                      setAdminMenuOpen(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 16px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: viewMode === 'team-board-settings' ? '#eff6ff' : 'transparent',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Team Board Settings
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {isAppAdmin && (
        <button
          type="button"
          onClick={() => setViewMode('app-admin')}
          style={{
            padding: '12px 16px',
            border: 'none',
            borderBottom: viewMode === 'app-admin' ? '3px solid #3b82f6' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: viewMode === 'app-admin' ? '#3b82f6' : '#6b7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: viewMode === 'app-admin' ? '600' : '400',
          }}
        >
          App Admin
        </button>
      )}
      {firebaseUser && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setViewMode('user-profile')}
            title="My profile"
            aria-label="Open profile"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {avatarInitials()}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
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
        </div>
      )}
    </nav>
  );
};

export default Navigation;
