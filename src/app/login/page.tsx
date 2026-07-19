'use client';

import React, { useState } from 'react';
import { Lock, User, RefreshCw, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check credentials.');
      } else {
        // Redirect to main dashboard
        window.location.href = '/';
      }
    } catch (err) {
      console.error(err);
      setError('Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#F5F6F8',
      padding: '24px'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 32px',
          background: '#FFFFFF',
          border: '1px solid #EBECEF',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(22, 25, 29, 0.04)',
          animation: 'fadeUp 0.4s ease forwards',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Brand Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px'
        }}>
          <img
            src="/morango_logo.jpg"
            alt="Morango AI"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              objectFit: 'cover',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{
              fontSize: '20px',
              fontWeight: 800,
              letterSpacing: '-0.4px',
              color: '#16191D',
            }}>
              Morango<span style={{ color: '#E8483D' }}>Ai</span>
            </span>
            <span style={{
              fontSize: '11px',
              color: '#9AA1AD',
              fontWeight: 600,
              letterSpacing: '0.2px',
              textTransform: 'uppercase'
            }}>
              CRM Workspace
            </span>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px', width: '100%' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16191D', marginBottom: '6px' }}>
            Welcome Back
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#5A616E', fontWeight: 500 }}>
            Log in to manage your voice leads & automation
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            width: '100%',
            backgroundColor: '#FDEBE9',
            border: '1px solid #F6D5CF',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '20px',
            fontSize: '0.82rem',
            color: '#E8483D',
            fontWeight: 600,
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} color="#9AA1AD" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  paddingLeft: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  fontSize: '0.88rem'
                }}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#9AA1AD" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  paddingLeft: '42px',
                  paddingRight: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  fontSize: '0.88rem'
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9AA1AD',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#5A616E')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9AA1AD')}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              height: '44px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              width: '100%',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="spinning" /> Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Footer info */}
        <p style={{
          marginTop: '32px',
          fontSize: '0.75rem',
          color: '#9AA1AD',
          fontWeight: 600,
          textAlign: 'center'
        }}>
          MorangoAI &bull; Automated CRM Security
        </p>
      </div>
    </div>
  );
}
