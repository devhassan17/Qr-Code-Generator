'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, ArrowRight, ShieldCheck, AlertCircle, UserPlus, LogIn, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

  // Sign In state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('qr_hub_permanent_vault');
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          username: regUsername,
          password: regPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Error creating profile');
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('qr_hub_permanent_vault');
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div
        style={{
          background: 'rgba(18, 26, 43, 0.94)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '24px',
          padding: '36px 32px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          textAlign: 'center',
        }}
      >
        {/* Brand Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 16px',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.35)',
          }}
        >
          <QrCode size={30} />
        </div>

        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '6px',
            letterSpacing: '-0.5px',
          }}
        >
          QR Hub & Analytics Portal
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '13.5px', marginBottom: '22px' }}>
          Manage your dynamic QR codes, profile campaigns & scan tracking.
        </p>

        {/* Tab Toggle: Sign In vs Create Profile */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '22px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: activeTab === 'signin' ? '#10b981' : 'transparent',
              color: activeTab === 'signin' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'signin' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none',
            }}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: activeTab === 'register' ? '#10b981' : 'transparent',
              color: activeTab === 'register' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'register' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none',
            }}
          >
            <UserPlus size={15} />
            <span>Create Profile</span>
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '11px 13px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px',
              textAlign: 'left',
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* --- SIGN IN FORM --- */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Admin or rep username"
                required
                autoFocus
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px',
                fontSize: '14.5px',
              }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* --- REGISTER NEW PROFILE FORM --- */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                }}
              >
                Full Name / Sales Rep Name
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Mike Stevens (Rep)"
                required
                autoFocus
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                }}
              >
                Choose Username
              </label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="e.g. mikerep"
                required
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                }}
              >
                Choose Password
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px',
                fontSize: '14.5px',
              }}
            >
              <span>{loading ? 'Creating Profile...' : 'Create Profile & Enter'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#64748b',
          }}
        >
          <ShieldCheck size={14} color="#10b981" />
          <span>Encrypted Profile Isolation & Cloud Persistence</span>
        </div>
      </div>
    </div>
  );
}
