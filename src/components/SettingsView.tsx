'use client';

import React, { useEffect, useState } from 'react';
import { Database, User, Shield, Key, Plus, Trash2, RefreshCw, Edit2, Check, X, Mail } from 'lucide-react';

interface SettingsViewProps {
  isDemoMode: boolean;
  onProfileUpdate?: () => void;
}

export default function SettingsView({
  isDemoMode,
  onProfileUpdate
}: SettingsViewProps) {
  // Tabs: 'profile' | 'database' | 'users' | 'mail'
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'database' | 'users' | 'mail'>('profile');

  // SMTP Config states
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('sales@morangoai.com');
  const [meetingLink, setMeetingLink] = useState('https://calendly.com/morangoai');
  const [adminEmail, setAdminEmail] = useState('sales@morangoai.com');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('60');
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpError, setSmtpError] = useState('');
  const [smtpSuccess, setSmtpSuccess] = useState('');

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

  const fetchSmtpSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSmtpHost(data.smtp_host || '');
        setSmtpPort(data.smtp_port || '587');
        setSmtpUser(data.smtp_user || '');
        setSmtpPass(data.smtp_pass || '');
        setSmtpFrom(data.smtp_from || 'sales@morangoai.com');
        setMeetingLink(data.meeting_link || 'https://calendly.com/morangoai');
        setAdminEmail(data.admin_email || 'sales@morangoai.com');
        setRemindersEnabled(data.reminders_enabled !== 'false');
        setReminderTime(data.reminder_time || '60');
      }
    } catch (err) {
      console.error('Error fetching SMTP settings:', err);
    }
  };

  const handleSaveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpHost.trim() || !smtpPort.trim() || !smtpUser.trim() || !smtpFrom.trim() || !meetingLink.trim() || !adminEmail.trim() || !reminderTime.trim()) {
      setSmtpError('Please fill out all required fields.');
      showToast('All fields except password are required.', 'error');
      return;
    }

    setSmtpError('');
    setSmtpSuccess('');
    setIsSavingSmtp(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
          smtp_from: smtpFrom,
          meeting_link: meetingLink,
          admin_email: adminEmail,
          reminders_enabled: remindersEnabled ? 'true' : 'false',
          reminder_time: reminderTime
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSmtpError(data.error || 'Failed to save SMTP settings.');
        showToast(data.error || 'Failed to save SMTP settings.', 'error');
      } else {
        setSmtpSuccess('SMTP configurations updated successfully!');
        showToast('SMTP credentials saved!', 'success');
        fetchSmtpSettings(); // Reload
      }
    } catch (err) {
      console.error(err);
      setSmtpError('Failed to save SMTP configurations.');
      showToast('Failed to save SMTP configurations.', 'error');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'users') {
      fetchUsers();
    } else if (activeSubTab === 'mail') {
      fetchSmtpSettings();
    }
  }, [activeSubTab]);

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
      setUserError('Password must be at least 8 characters.');
      showToast('Password must be at least 8 characters.', 'error');
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
        setTimeout(() => {
          window.location.reload();
        }, 1500);
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
    <div className="settings-layout-grid" style={{ animation: 'fadeUp 0.3s ease', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
      
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
        <button
          onClick={() => setActiveSubTab('mail')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: 'none',
            background: activeSubTab === 'mail' ? '#FDEBE9' : 'transparent',
            color: activeSubTab === 'mail' ? '#E8483D' : '#5A616E',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Mail size={15} color={activeSubTab === 'mail' ? '#E8483D' : '#9AA1AD'} />
          Mail Configuration
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
          <div style={{ maxWidth: '640px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#16191D' }}>Database Connection</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', color: '#9AA1AD', fontWeight: 500 }}>
              The database connection is managed securely on the server via Prisma ORM.
            </p>

            <div style={{
              padding: '16px 18px',
              borderRadius: '12px',
              border: '1px solid #ECEDEF',
              background: isDemoMode ? '#FFFBEB' : '#F0FDF4',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#16191D', marginBottom: '6px' }}>
                Status: {isDemoMode ? 'Demo mode (local browser storage)' : 'Connected to PostgreSQL'}
              </div>
              <div style={{ fontSize: '12px', color: '#5A616E', lineHeight: 1.5 }}>
                {isDemoMode
                  ? 'Set DATABASE_URL in your server environment, then restart the app.'
                  : 'Production database access is handled securely through authenticated API routes.'}
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#5A616E', lineHeight: 1.6 }}>
              <strong>Required server variables:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
                <li>DATABASE_URL</li>
                <li>JWT_SECRET</li>
                <li>VAPI_WEBHOOK_SECRET</li>
                <li>CRON_SECRET</li>
              </ul>
            </div>
          </div>
        )}

        {/* SUBTAB 3: USER ACCOUNTS */}
        {activeSubTab === 'users' && (
          <div className="users-split-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            
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
                          className="active-user-item"
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
            <div className="add-user-section" style={{ borderLeft: '1px solid #F1F2F4', paddingLeft: '32px' }}>
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

        {/* SUBTAB 4: MAIL CONFIGURATION */}
        {activeSubTab === 'mail' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#16191D' }}>Nodemailer SMTP Configuration</h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#9AA1AD', fontWeight: 500 }}>
                  Configure SMTP credentials to automatically trigger meeting confirmation emails.
                </p>
              </div>
              {smtpUser && smtpPass && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  background: '#DCFCE7',
                  border: '1px solid #BBF7D0',
                  borderRadius: '30px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#15803D',
                  boxShadow: '0 2px 4px rgba(22,163,74,0.05)'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#16A34A',
                    display: 'inline-block',
                    boxShadow: '0 0 0 2px rgba(22,163,74,0.2)'
                  }} />
                  Connected: <strong style={{ color: '#14532D', textDecoration: 'underline' }}>{smtpUser}</strong>
                </div>
              )}
            </div>

            <div style={{ maxWidth: '540px' }}>


            {smtpError && (
              <div style={{ backgroundColor: '#FDEBE9', border: '1px solid #F6D5CF', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.82rem', color: '#E8483D', fontWeight: 600 }}>
                {smtpError}
              </div>
            )}

            {smtpSuccess && (
              <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.82rem', color: '#16A34A', fontWeight: 600 }}>
                {smtpSuccess}
              </div>
            )}

            <form onSubmit={handleSaveSmtpSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="smtp-config-grid" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    placeholder="mail.example.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    required
                    style={{ height: '40px', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    required
                    style={{ height: '40px', fontSize: '0.88rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                  SMTP Username / Email
                </label>
                <input
                  type="text"
                  placeholder="user@example.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  required
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                  SMTP Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                  Sender Email (From)
                </label>
                <input
                  type="email"
                  placeholder="noreply@example.com"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  required
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                  Default Meeting Link / Calendly URL
                </label>
                <input
                  type="url"
                  placeholder="https://calendly.com/morangoai"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  required
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                  Admin Notification Email
                </label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#FAFBFC', border: '1px solid #EBECEF', borderRadius: '12px', marginTop: '4px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '13.5px', fontWeight: 800, color: '#16191D' }}>Automated Reminders</h4>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#16191D', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={remindersEnabled}
                    onChange={(e) => setRemindersEnabled(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#E8483D', cursor: 'pointer' }}
                  />
                  Enable Pre-meeting Email Reminders
                </label>

                {remindersEnabled && (
                  <div style={{ marginTop: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                      Reminder Time (minutes before meeting start)
                    </label>
                    <input
                      type="number"
                      placeholder="60"
                      min="1"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      required
                      style={{ height: '36px', fontSize: '0.82rem', width: '100%' }}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', height: '40px', padding: '0 24px', marginTop: '8px' }}
                disabled={isSavingSmtp}
              >
                {isSavingSmtp ? (
                  <>
                    <RefreshCw size={14} className="spinning" /> Saving...
                  </>
                ) : (
                  'Save SMTP configurations'
                )}
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
