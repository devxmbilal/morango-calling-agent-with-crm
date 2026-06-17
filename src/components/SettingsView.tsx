'use client';

import React, { useEffect, useState } from 'react';
import { Database, User, Shield, Key, Plus, Trash2, RefreshCw, Edit2, Check, X } from 'lucide-react';

interface SettingsViewProps {
  isDemoMode: boolean;
  dbUrlInitial: string;
  dbAnonKeyInitial: string;
  onSaveDbSettings: (url: string, key: string) => void;
  onClearDbSettings: () => void;
  onProfileUpdate?: () => void;
}

export default function SettingsView({
  isDemoMode,
  dbUrlInitial,
  dbAnonKeyInitial,
  onSaveDbSettings,
  onClearDbSettings,
  onProfileUpdate
}: SettingsViewProps) {
  // Tabs: 'profile' | 'database' | 'users'
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'database' | 'users'>('profile');

  // Database Connection states
  const [dbUrl, setDbUrl] = useState(dbUrlInitial);
  const [dbAnonKey, setDbAnonKey] = useState(dbAnonKeyInitial);

  // Active User Profile states
  const [currentUserId, setCurrentUserId] = useState('');
  const [myUsername, setMyUsername] = useState('');
  const [myName, setMyName] = useState('');
  const [myPassword, setMyPassword] = useState('');
  const [myProfileError, setMyProfileError] = useState('');
  const [myProfileSuccess, setMyProfileSuccess] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // User creation states
  const [userUsername, setUserUsername] = useState('');
  const [userDisplayName, setUserDisplayName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Toast state
  interface ToastItem {
    message: string;
    type: 'success' | 'error' | 'info';
    id: number;
  }
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Users listing state
  const [usersList, setUsersList] = useState<{ id: string; username: string; name?: string; created_at: string }[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // User editing states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // User actions helpers
  const handleStartEdit = (user: { id: string; username: string; name?: string }) => {
    setEditingUserId(user.id);
    setEditName(user.name || '');
    setEditUsername(user.username);
    setEditPassword('');
    setEditError('');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditError('');
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      showToast("You cannot delete your own active user account.", "error");
      return;
    }
    if (!confirm("Are you sure you want to delete this user account? This will permanently remove their access credentials.")) {
      return;
    }

    try {
      const res = await fetch('/api/auth/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete user.', 'error');
      } else {
        showToast('User account deleted successfully.', 'success');
        fetchUsers();
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete user.', 'error');
    }
  };

  const handleSaveUserEdit = async (userId: string) => {
    if (!editUsername.trim()) {
      setEditError('Username is required.');
      showToast('Username is required for user updates.', 'error');
      return;
    }
    setEditError('');
    setIsSavingEdit(true);

    try {
      const res = await fetch('/api/auth/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username: editUsername,
          name: editName,
          password: editPassword || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to update user.');
        showToast(data.error || 'Failed to update user.', 'error');
      } else {
        setEditingUserId(null);
        showToast('User details updated successfully!', 'success');
        fetchUsers();
        // If we edited our own user session, reload page session details
        if (userId === currentUserId) {
          fetchSession();
          if (onProfileUpdate) {
            onProfileUpdate();
          }
        }
      }
    } catch (err) {
      console.error(err);
      setEditError('Failed to save user updates.');
      showToast('Failed to save user updates.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Fetch Current Logged-in User Session
  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.id);
        setMyUsername(data.username);
        setMyName(data.name || '');
      }
    } catch (err) {
      console.error('Session load error:', err);
    }
  };

  // Fetch Users List (for User panel)
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'users') {
      fetchUsers();
    }
  }, [activeSubTab]);

  // Handle DB configurations save
  const handleDbSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDbSettings(dbUrl, dbAnonKey);
  };

  // Handle My Profile Update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myUsername.trim()) {
      setMyProfileError('Username is required.');
      return;
    }

    setMyProfileError('');
    setMyProfileSuccess('');
    setIsUpdatingProfile(true);

    try {
      const res = await fetch('/api/auth/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          username: myUsername,
          name: myName,
          password: myPassword || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setMyProfileError(data.error || 'Failed to update profile.');
        showToast(data.error || 'Failed to update profile.', 'error');
      } else {
        setMyProfileSuccess('Profile updated successfully!');
        showToast('My Profile updated successfully!', 'success');
        setMyPassword('');
        // Update display data in page context if needed
        fetchSession();
        if (onProfileUpdate) {
          onProfileUpdate();
        }
      }
    } catch (err) {
      console.error(err);
      setMyProfileError('Failed to save profile updates.');
      showToast('Failed to save profile updates.', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle new User Creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUsername.trim() || !userPassword.trim()) {
      setUserError('Username and password are required.');
      showToast('Username and password are required.', 'error');
      return;
    }
    if (userPassword.length < 6) {
      setUserError('Password must be at least 6 characters.');
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setUserError('');
    setUserSuccess('');
    setIsCreatingUser(true);

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userUsername,
          password: userPassword,
          name: userDisplayName || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error || 'Failed to register user.');
        showToast(data.error || 'Failed to register user.', 'error');
      } else {
        setUserSuccess('User registered successfully!');
        showToast(`User @${userUsername} registered successfully!`, 'success');
        setUserUsername('');
        setUserPassword('');
        setUserDisplayName('');
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      setUserError('Failed to register user account.');
      showToast('Failed to register user account.', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div style={{ animation: 'fadeUp 0.3s ease', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
      
      {/* Subtab selection sidebar */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', background: '#FFFFFF' }}>
        <button
          onClick={() => setActiveSubTab('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: 'none',
            background: activeSubTab === 'profile' ? '#FDEBE9' : 'transparent',
            color: activeSubTab === 'profile' ? '#E8483D' : '#5A616E',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <User size={15} color={activeSubTab === 'profile' ? '#E8483D' : '#9AA1AD'} />
          My Profile
        </button>
        <button
          onClick={() => setActiveSubTab('database')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: 'none',
            background: activeSubTab === 'database' ? '#FDEBE9' : 'transparent',
            color: activeSubTab === 'database' ? '#E8483D' : '#5A616E',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Database size={15} color={activeSubTab === 'database' ? '#E8483D' : '#9AA1AD'} />
          Database Config
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: 'none',
            background: activeSubTab === 'users' ? '#FDEBE9' : 'transparent',
            color: activeSubTab === 'users' ? '#E8483D' : '#5A616E',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Shield size={15} color={activeSubTab === 'users' ? '#E8483D' : '#9AA1AD'} />
          User Accounts
        </button>
      </div>

      {/* Main Settings Panel Area */}
      <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF', minHeight: '350px' }}>
        
        {/* SUBTAB 1: MY PROFILE */}
        {activeSubTab === 'profile' && (
          <div style={{ maxWidth: '480px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#16191D' }}>My Profile</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', color: '#9AA1AD', fontWeight: 500 }}>
              Update your workspace personal credentials and profile details.
            </p>

            {myProfileError && (
              <div style={{ backgroundColor: '#FDEBE9', border: '1px solid #F6D5CF', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.82rem', color: '#E8483D', fontWeight: 600 }}>
                {myProfileError}
              </div>
            )}

            {myProfileSuccess && (
              <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.82rem', color: '#16A34A', fontWeight: 600 }}>
                {myProfileSuccess}
              </div>
            )}

            <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={myUsername}
                  onChange={(e) => setMyUsername(e.target.value)}
                  required
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={myPassword}
                  onChange={(e) => setMyPassword(e.target.value)}
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', height: '40px', padding: '0 20px', marginTop: '8px' }}
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? (
                  <>
                    <RefreshCw size={14} className="spinning" /> Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </button>
            </form>
          </div>
        )}

        {/* SUBTAB 2: DATABASE CONFIG */}
        {activeSubTab === 'database' && (
          <div style={{ maxWidth: '540px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#16191D' }}>Database Connection</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', color: '#9AA1AD', fontWeight: 500 }}>
              Configure your Supabase PostgreSQL integration. This stores credentials locally in your browser.
            </p>

            <form onSubmit={handleDbSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                  Supabase URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-project.supabase.co"
                  value={dbUrl}
                  onChange={(e) => setDbUrl(e.target.value)}
                  required
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                  Supabase Anon Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={dbAnonKey}
                  onChange={(e) => setDbAnonKey(e.target.value)}
                  required
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ height: '40px', padding: '0 20px' }}
                  onClick={onClearDbSettings}
                >
                  Clear Config
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '40px', padding: '0 24px' }}
                >
                  Save &amp; Connect
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SUBTAB 3: USER ACCOUNTS */}
        {activeSubTab === 'users' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            
            {/* User accounts list */}
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#16191D' }}>Active Users</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#9AA1AD', fontWeight: 500 }}>
                A list of accounts authorized to access the CRM.
              </p>

              {isLoadingUsers ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9AA1AD', fontSize: '13px', padding: '24px 0' }}>
                  <RefreshCw size={14} className="spinning" /> Loading users...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {usersList.length === 0 ? (
                    <div style={{ color: '#9AA1AD', fontSize: '12.5px', textAlign: 'center', padding: '24px', border: '1px dashed #EBECEF', borderRadius: '10px' }}>
                      No user accounts found.
                    </div>
                  ) : (
                    usersList.map((user) => {
                      const isEditing = editingUserId === user.id;

                      if (isEditing) {
                        return (
                          <div 
                            key={user.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              padding: '14px',
                              border: '1px solid #EBECEF',
                              borderRadius: '10px',
                              background: '#FAFBFC',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#16191D' }}>Editing User</span>
                              <span style={{ fontSize: '10.5px', color: '#9AA1AD' }}>Updates apply to login credentials.</span>
                            </div>
                            
                            {editError && (
                              <div style={{ backgroundColor: '#FDEBE9', border: '1px solid #F6D5CF', borderRadius: '6px', padding: '6px 10px', fontSize: '0.75rem', color: '#E8483D', fontWeight: 600 }}>
                                {editError}
                              </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: '#AEB4BE', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Full Name</label>
                                <input 
                                  type="text"
                                  placeholder="Full Name"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  style={{ height: '34px', fontSize: '12.5px', padding: '0 10px', width: '100%', borderRadius: '8px', border: '1px solid #EBECEF', background: '#FFFFFF' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: '#AEB4BE', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Username</label>
                                <input 
                                  type="text"
                                  placeholder="Username"
                                  value={editUsername}
                                  onChange={(e) => setEditUsername(e.target.value)}
                                  required
                                  style={{ height: '34px', fontSize: '12.5px', padding: '0 10px', width: '100%', borderRadius: '8px', border: '1px solid #EBECEF', background: '#FFFFFF' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: '#AEB4BE', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Password</label>
                                <input 
                                  type="password"
                                  placeholder="Leave blank to keep same"
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  style={{ height: '34px', fontSize: '12.5px', padding: '0 10px', width: '100%', borderRadius: '8px', border: '1px solid #EBECEF', background: '#FFFFFF' }}
                                />
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #EBECEF',
                                  background: '#fff',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  color: '#5A616E',
                                  cursor: 'pointer'
                                }}
                              >
                                <X size={12} /> Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveUserEdit(user.id)}
                                disabled={isSavingEdit}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 12px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: '#E8483D',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  color: '#fff',
                                  cursor: 'pointer'
                                }}
                              >
                                {isSavingEdit ? 'Saving...' : <><Check size={12} /> Save</>}
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={user.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            border: '1px solid #EBECEF',
                            borderRadius: '10px',
                            background: '#FAFBFC'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#16191D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {user.name || 'Anonymous User'}
                              {user.id === currentUserId && (
                                <span style={{ fontSize: '10px', background: '#FDEBE9', color: '#E8483D', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  You
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: '11px', color: '#9AA1AD', fontWeight: 500 }}>
                              @{user.username}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#9AA1AD', fontWeight: 600 }}>
                              Created: {new Date(user.created_at).toLocaleDateString([], { dateStyle: 'short' })}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid #EBECEF', paddingLeft: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(user)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '5px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#F1F2F4';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                                title="Edit User"
                              >
                                <Edit2 size={13} color="#5A616E" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.id === currentUserId}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: user.id === currentUserId ? 'not-allowed' : 'pointer',
                                  padding: '5px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s',
                                  opacity: user.id === currentUserId ? 0.35 : 1
                                }}
                                onMouseEnter={(e) => {
                                  if (user.id !== currentUserId) {
                                    e.currentTarget.style.background = '#FEE2E2';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (user.id !== currentUserId) {
                                    e.currentTarget.style.background = 'transparent';
                                  }
                                }}
                                title={user.id === currentUserId ? "Cannot delete yourself" : "Delete User"}
                              >
                                <Trash2 size={13} color={user.id === currentUserId ? '#AEB4BE' : '#DC2626'} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Create new User */}
            <div style={{ borderLeft: '1px solid #F1F2F4', paddingLeft: '32px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#16191D' }}>Add User</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#9AA1AD', fontWeight: 500 }}>
                Register a new user with workspace access.
              </p>

              {userError && (
                <div style={{ backgroundColor: '#FDEBE9', border: '1px solid #F6D5CF', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '0.8rem', color: '#E8483D', fontWeight: 600 }}>
                  {userError}
                </div>
              )}

              {userSuccess && (
                <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>
                  {userSuccess}
                </div>
              )}

              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <input
                    type="text"
                    placeholder="Full Display Name (e.g. Areeba K.)"
                    value={userDisplayName}
                    onChange={(e) => setUserDisplayName(e.target.value)}
                    style={{ height: '38px', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Username"
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    required
                    style={{ height: '38px', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    required
                    style={{ height: '38px', fontSize: '0.82rem' }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', height: '38px', padding: '0 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={isCreatingUser}
                >
                  <Plus size={14} /> Add User
                </button>
              </form>
            </div>

          </div>
        )}

      </div>

      {/* Toast Notifier Portal Container */}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '360px',
        width: '100%',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: '#FFFFFF',
              borderLeft: `4px solid ${
                toast.type === 'success' ? '#16A34A' : toast.type === 'error' ? '#DC2626' : '#E8483D'
              }`,
              boxShadow: '0 10px 25px rgba(22, 25, 29, 0.08), 0 2px 4px rgba(22, 25, 29, 0.02)',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              animation: 'slideInRight 0.3s ease forwards',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: toast.type === 'success' ? '#16A34A' : toast.type === 'error' ? '#DC2626' : '#E8483D'
              }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#16191D' }}>
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
            >
              <X size={12} color="#AEB4BE" />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
