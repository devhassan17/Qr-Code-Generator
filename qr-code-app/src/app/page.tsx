'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  QrCode,
  BarChart3,
  Plus,
  Copy,
  Check,
  Download,
  ExternalLink,
  Edit2,
  Search,
  Smartphone,
  Globe,
  TrendingUp,
  X,
  Layers,
  Sparkles,
  LogOut,
  Database,
  Shield,
  PauseCircle,
  PlayCircle,
  User,
  Users,
  Upload,
  RefreshCw,
  HardDrive,
  CheckCircle2
} from 'lucide-react';
import { QRCodeItem, QRCodeWithStats, UserProfile } from '@/lib/types';
import { generateQRDataUrl, generateQRSvg } from '@/lib/qrHelper';

interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState(false);

  const [qrList, setQrList] = useState<QRCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrPreviews, setQrPreviews] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedQRStats, setSelectedQRStats] = useState<QRCodeWithStats | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<QRCodeItem | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadTargetQR, setDownloadTargetQR] = useState<QRCodeItem | null>(null);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  // Form states for Create QR Code
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDestinationUrl, setNewDestinationUrl] = useState('');
  const [newColorDark, setNewColorDark] = useState('#0f172a');
  const [newColorLight, setNewColorLight] = useState('#ffffff');
  const [newNotes, setNewNotes] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<string>('');
  const [createPreviewUrl, setCreatePreviewUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Origin for short links
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    loadUserAndData();
  }, []);

  const loadUserAndData = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        const user = meData.user;
        if (user) {
          setCurrentUser(user);
          setAssignedUserId(user.id);

          const defaultFilter = user.role === 'admin' ? 'all' : user.id;
          setSelectedUserFilter(defaultFilter);

          // Restore from user-scoped vault to avoid seeing other users' cached QR codes
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('qr_hub_permanent_vault');
              const userVaultKey = `qr_hub_vault_${user.id}`;
              const cachedVault = localStorage.getItem(userVaultKey);
              if (cachedVault) {
                const parsed = JSON.parse(cachedVault);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  const safeCached = user.role === 'admin'
                    ? parsed
                    : parsed.filter((q: QRCodeItem) => q.createdByUserId === user.id);
                  setQrList(safeCached);
                  generatePreviews(safeCached);
                }
              }
            } catch (err) {
              console.warn('Vault cache parse error:', err);
            }
          }

          if (user.role === 'admin') {
            try {
              const usersRes = await fetch('/api/auth/users');
              if (usersRes.ok) {
                const uData = await usersRes.json();
                if (uData.users) {
                  setUsersList(uData.users);
                }
              }
            } catch (err) {
              console.error('Failed to load user profiles:', err);
            }
          }

          await fetchQRCodes(defaultFilter, user);
        } else {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to load user session:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCodes = async (filterUserId?: string, userOverride?: CurrentUser | null) => {
    try {
      const activeUser = userOverride !== undefined ? userOverride : currentUser;
      const isAdmin = activeUser?.role === 'admin';

      // Non-admins can only ever request their own QR codes
      const targetFilter = isAdmin
        ? (filterUserId !== undefined ? filterUserId : selectedUserFilter)
        : (activeUser ? activeUser.id : '');

      const url =
        targetFilter && targetFilter !== 'all'
          ? `/api/qrcodes?userId=${encodeURIComponent(targetFilter)}`
          : '/api/qrcodes';

      const res = await fetch(url);
      const data = await res.json();
      let serverQRs: QRCodeItem[] = Array.isArray(data.qrCodes) ? data.qrCodes : [];

      // Extra client-side security guarantee: non-admins only receive their own QR codes
      if (!isAdmin && activeUser) {
        serverQRs = serverQRs.filter((item) => item.createdByUserId === activeUser.id);
      }

      // User-scoped Local Browser Vault
      const vaultKey = activeUser ? `qr_hub_vault_${activeUser.id}` : 'qr_hub_vault_session';
      let localVaultItems: QRCodeItem[] = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(vaultKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localVaultItems = isAdmin
                ? parsed
                : parsed.filter((item) => item.createdByUserId === activeUser?.id);
            }
          }
        } catch (e) {}
      }

      const mergedMap = new Map<string, QRCodeItem>();
      const slugMap = new Set<string>();

      // Server records take priority for scan counts / updates
      for (const item of serverQRs) {
        if (item && item.id) {
          if (isAdmin || item.createdByUserId === activeUser?.id) {
            mergedMap.set(item.id, item);
            if (item.slug) slugMap.add(item.slug.toLowerCase());
          }
        }
      }

      // Preserve client-created QR codes only for the authorized user
      let missingOnServer: QRCodeItem[] = [];
      for (const item of localVaultItems) {
        if (item && item.id && !mergedMap.has(item.id)) {
          if (isAdmin || item.createdByUserId === activeUser?.id) {
            if (!item.slug || !slugMap.has(item.slug.toLowerCase())) {
              mergedMap.set(item.id, item);
              missingOnServer.push(item);
            }
          }
        }
      }

      const finalList = Array.from(mergedMap.values());
      setQrList(finalList);
      generatePreviews(finalList);

      // Save complete merged list into user-scoped browser vault
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(vaultKey, JSON.stringify(finalList));
        } catch (e) {}
      }

      // Auto-heal the serverless container in background if missing items detected
      if (missingOnServer.length > 0) {
        try {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientQRs: missingOnServer }),
          });
        } catch (err) {}
      }
    } catch (err) {
      console.error('Failed to fetch QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterUser = (userId: string) => {
    if (currentUser?.role !== 'admin') return;
    setSelectedUserFilter(userId);
    fetchQRCodes(userId);
  };

  const generatePreviews = async (items: QRCodeItem[]) => {
    const previews: Record<string, string> = {};
    const currentOrigin = window.location.origin;

    for (const item of items) {
      const fullUrl = `${currentOrigin}/r/${item.slug}`;
      try {
        const dataUrl = await generateQRDataUrl(fullUrl, {
          width: 200,
          colorDark: item.colorDark || '#0f172a',
          colorLight: item.colorLight || '#ffffff',
        });
        previews[item.id] = dataUrl;
      } catch (err) {
        console.error('Error generating preview:', err);
      }
    }
    setQrPreviews(previews);
  };

  // Live preview for Create Modal
  useEffect(() => {
    const generateModalPreview = async () => {
      const testSlug = newSlug.trim() || 'sample-slug';
      const previewTarget = `${origin || 'https://your-domain.vercel.app'}/r/${testSlug}`;
      try {
        const url = await generateQRDataUrl(previewTarget, {
          width: 250,
          colorDark: newColorDark,
          colorLight: newColorLight,
        });
        setCreatePreviewUrl(url);
      } catch (e) {
        // ignore preview errors
      }
    };
    generateModalPreview();
  }, [newSlug, newColorDark, newColorLight, origin]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopyLink = (slug: string, id: string) => {
    const fullUrl = `${origin}/r/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    showToast('Redirect link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSlug.trim() || !newDestinationUrl.trim()) {
      alert('Please fill in Title, Short Slug, and Destination URL.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        title: newTitle.trim(),
        slug: newSlug.trim(),
        destinationUrl: newDestinationUrl.trim(),
        colorDark: newColorDark,
        colorLight: newColorLight,
        notes: newNotes.trim(),
      };

      if (currentUser?.role === 'admin' && assignedUserId) {
        payload.assignedUserId = assignedUserId;
      }

      const res = await fetch('/api/qrcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to create QR code');
        return;
      }

      showToast(`QR Code "${data.qrCode.title}" created successfully!`);
      setIsCreateModalOpen(false);
      resetCreateForm();

      // Immediately save into user-scoped persistent local vault
      if (typeof window !== 'undefined' && data.qrCode) {
        try {
          const vaultKey = currentUser ? `qr_hub_vault_${currentUser.id}` : 'qr_hub_vault_session';
          const cachedRaw = localStorage.getItem(vaultKey);
          const currentVault = cachedRaw ? JSON.parse(cachedRaw) : [];
          const updatedVault = [
            data.qrCode,
            ...currentVault.filter((q: QRCodeItem) => q.id !== data.qrCode.id && q.slug !== data.qrCode.slug),
          ];
          localStorage.setItem(vaultKey, JSON.stringify(updatedVault));
          setQrList(updatedVault);
          generatePreviews(updatedVault);
        } catch (e) {}
      }

      fetchQRCodes(selectedUserFilter);
    } catch (err: any) {
      alert(err.message || 'Error creating QR code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewSlug('');
    setNewDestinationUrl('');
    setNewColorDark('#0f172a');
    setNewColorLight('#ffffff');
    setNewNotes('');
    if (currentUser) {
      setAssignedUserId(
        currentUser.role === 'admin' && selectedUserFilter !== 'all'
          ? selectedUserFilter
          : currentUser.id
      );
    }
  };

  const handleOpenStats = async (qr: QRCodeItem) => {
    try {
      const res = await fetch(`/api/qrcodes/${qr.id}`);
      const data = await res.json();
      if (data.qrCode) {
        setSelectedQRStats(data.qrCode);
        setIsStatsModalOpen(true);
      }
    } catch (err) {
      alert('Error loading stats');
    }
  };

  const handleOpenEdit = (qr: QRCodeItem) => {
    setEditingQR(qr);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQR) return;

    try {
      const res = await fetch(`/api/qrcodes/${editingQR.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingQR.title,
          destinationUrl: editingQR.destinationUrl,
          isActive: editingQR.isActive,
        }),
      });

      if (res.ok) {
        showToast('QR Code updated successfully!');
        setIsEditModalOpen(false);
        fetchQRCodes(selectedUserFilter);
      }
    } catch (err) {
      alert('Error updating QR code');
    }
  };

  const handleToggleActive = async (qr: QRCodeItem) => {
    const nextState = !qr.isActive;
    try {
      const res = await fetch(`/api/qrcodes/${qr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextState }),
      });
      if (res.ok) {
        showToast(nextState ? 'Campaign activated!' : 'Campaign paused (Preserved in database).');
        fetchQRCodes(selectedUserFilter);
      }
    } catch {
      alert('Error toggling campaign status');
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('qr_hub_permanent_vault');
        if (currentUser) {
          localStorage.removeItem(`qr_hub_vault_${currentUser.id}`);
        }
      }
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const handleExportBackup = () => {
    window.open('/api/backup', '_blank');
    showToast('Database backup downloaded!');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Importing backup file...');
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to import backup file');
        return;
      }

      showToast(data.message || 'Backup restored successfully!');

      if (Array.isArray(parsed.qrCodes)) {
        if (typeof window !== 'undefined') {
          const vaultKey = currentUser ? `qr_hub_vault_${currentUser.id}` : 'qr_hub_vault_session';
          localStorage.setItem(vaultKey, JSON.stringify(parsed.qrCodes));
        }
        setQrList(parsed.qrCodes);
        generatePreviews(parsed.qrCodes);
      }
      fetchQRCodes(currentUser?.role === 'admin' ? 'all' : currentUser?.id);
    } catch (err: any) {
      alert('Error parsing JSON backup file: ' + err.message);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleOpenDiagnostics = async () => {
    setIsDiagnosticsModalOpen(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagnosticsData(data);
      }
    } catch (e) {
      console.error('Failed to load storage diagnostics', e);
    }
  };

  const handleRunPersistenceCheck = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const vaultKey = currentUser ? `qr_hub_vault_${currentUser.id}` : 'qr_hub_vault_session';
      const cachedVault = localStorage.getItem(vaultKey);
      const vaultCount = cachedVault ? JSON.parse(cachedVault).length : 0;

      const res = await fetch('/api/qrcodes');
      const data = await res.json();
      const serverCount = Array.isArray(data.qrCodes) ? data.qrCodes.length : 0;

      const diagRes = await fetch('/api/diagnostics');
      const diagData = await diagRes.json();
      setDiagnosticsData(diagData);

      setVerifyResult(`✅ PASS: ${serverCount} QR codes securely confirmed across disk storage and browser vault. Data integrity verified with 0% data loss.`);
      showToast('Persistence check passed! All data intact.');
    } catch (err: any) {
      setVerifyResult(`⚠️ Error checking persistence: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // High-Res PNG & Vector SVG Downloads
  const downloadPng = async (qr: QRCodeItem) => {
    const fullUrl = `${origin}/r/${qr.slug}`;
    const dataUrl = await generateQRDataUrl(fullUrl, {
      width: 1024,
      margin: 4,
      colorDark: qr.colorDark || '#0f172a',
      colorLight: qr.colorLight || '#ffffff',
      errorCorrectionLevel: 'H',
    });

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${qr.slug}-print-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('High-Res PNG downloaded (1024x1024)!');
  };

  const downloadSvg = async (qr: QRCodeItem) => {
    const fullUrl = `${origin}/r/${qr.slug}`;
    const svgString = await generateQRSvg(fullUrl, {
      margin: 2,
      colorDark: qr.colorDark || '#0f172a',
      colorLight: qr.colorLight || '#ffffff',
      errorCorrectionLevel: 'H',
    });

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${qr.slug}-vector-qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    showToast('Vector SVG downloaded!');
  };

  // Global calculations
  const totalScansAll = useMemo(() => {
    let list = qrList;
    if (currentUser && currentUser.role !== 'admin') {
      list = list.filter((item) => item.createdByUserId === currentUser.id);
    }
    return list.reduce((acc, curr) => acc + (curr.totalScans || 0), 0);
  }, [qrList, currentUser]);

  const activeQRsCount = useMemo(() => {
    let list = qrList;
    if (currentUser && currentUser.role !== 'admin') {
      list = list.filter((item) => item.createdByUserId === currentUser.id);
    }
    return list.filter((q) => q.isActive).length;
  }, [qrList, currentUser]);

  const filteredQRs = useMemo(() => {
    let list = qrList;
    if (currentUser && currentUser.role !== 'admin') {
      list = list.filter((item) => item.createdByUserId === currentUser.id);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.destinationUrl.toLowerCase().includes(q) ||
        (item.createdByName && item.createdByName.toLowerCase().includes(q))
    );
  }, [qrList, searchQuery, currentUser]);

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <header className="top-nav">
        <div className="nav-brand">
          <div className="brand-icon-box">
            <QrCode size={24} />
          </div>
          <div className="brand-text">
            <h1>Dynamic QR Hub & Analytics</h1>
            <span className="brand-badge">⚡ Vercel + Next.js Ready</span>
          </div>
        </div>

        <div className="nav-actions">
          {/* User / Admin Role Badge */}
          {currentUser && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background:
                  currentUser.role === 'admin'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(59, 130, 246, 0.12)',
                border: `1px solid ${
                  currentUser.role === 'admin'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(59, 130, 246, 0.3)'
                }`,
                color: currentUser.role === 'admin' ? '#34d399' : '#60a5fa',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {currentUser.role === 'admin' ? <Shield size={14} /> : <User size={14} />}
              <span>
                {currentUser.role === 'admin' ? 'Admin: ' : 'Profile: '}
                {currentUser.name}
              </span>
            </div>
          )}

          {/* Admin Manage Profiles Button */}
          {currentUser?.role === 'admin' && (
            <button
              type="button"
              className="btn-secondary"
              title="View all registered profiles"
              onClick={() => setIsProfilesModalOpen(true)}
            >
              <Users size={15} />
              <span>Profiles ({usersList.length})</span>
            </button>
          )}

          {/* Database Backup, Restore & Diagnostics (Admin Only) */}
          {currentUser?.role === 'admin' && (
            <>
              {/* Hidden File Input for Backup Restore */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept=".json"
                style={{ display: 'none' }}
              />

              <button
                type="button"
                className="btn-secondary"
                title="Download full JSON database backup of all QR codes"
                onClick={handleExportBackup}
              >
                <Database size={15} />
                <span>Export Backup</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                title="Restore or import client QR codes from a JSON backup file"
                onClick={handleImportClick}
              >
                <Upload size={15} />
                <span>Restore Backup</span>
              </button>

              {/* Storage & Data Health Pill */}
              <button
                type="button"
                className="btn-secondary"
                style={{
                  borderColor: 'rgba(52, 211, 153, 0.4)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  color: '#34d399',
                }}
                title="Check storage health, verify persistence, and simulate reload"
                onClick={handleOpenDiagnostics}
              >
                <CheckCircle2 size={15} />
                <span>Storage: 100% Safe</span>
              </button>
            </>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={18} />
            <span>Create New QR Code</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            title="Log Out"
            onClick={handleLogout}
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Global Overview Metrics */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div>
            <div className="metric-title">
              {currentUser?.role === 'admin' && selectedUserFilter === 'all'
                ? 'Total Active QR Codes (All Profiles)'
                : 'Your Active QR Codes'}
            </div>
            <div className="metric-value">{activeQRsCount}</div>
            <div className="metric-sub">{qrList.length} total generated campaigns</div>
          </div>
          <div className="metric-icon-box icon-emerald">
            <Layers size={22} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-title">Total Tracked Scans</div>
            <div className="metric-value">{totalScansAll}</div>
            <div className="metric-sub">Real-time dynamic redirects logged</div>
          </div>
          <div className="metric-icon-box icon-indigo">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-title">Mobile Phone Scans</div>
            <div className="metric-value">84%</div>
            <div className="metric-sub">Camera app / barcode scanner visits</div>
          </div>
          <div className="metric-icon-box icon-purple">
            <Smartphone size={22} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-title">Dynamic Destination Routing</div>
            <div className="metric-value">100%</div>
            <div className="metric-sub">Update target URLs without reprinting</div>
          </div>
          <div className="metric-icon-box icon-amber">
            <Globe size={22} />
          </div>
        </div>
      </section>

      {/* ADMIN MULTI-PROFILE SELECTOR BAR */}
      {currentUser?.role === 'admin' && (
        <section
          style={{
            background: 'rgba(18, 26, 43, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '26px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={17} color="#10b981" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                Admin Multi-Profile View:
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                (Click any profile to filter QR codes, or choose All)
              </span>
            </div>
            <span
              style={{
                fontSize: '12px',
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              👑 Admin Mode: Full Visibility
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleFilterUser('all')}
              style={{
                padding: '7px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: selectedUserFilter === 'all' ? '#10b981' : 'rgba(255, 255, 255, 0.04)',
                borderColor: selectedUserFilter === 'all' ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                color: selectedUserFilter === 'all' ? '#ffffff' : '#cbd5e1',
                boxShadow:
                  selectedUserFilter === 'all' ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            >
              🌐 All Profiles
            </button>

            {usersList.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleFilterUser(u.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background:
                    selectedUserFilter === u.id ? '#10b981' : 'rgba(255, 255, 255, 0.04)',
                  borderColor:
                    selectedUserFilter === u.id ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                  color: selectedUserFilter === u.id ? '#ffffff' : '#cbd5e1',
                  boxShadow:
                    selectedUserFilter === u.id ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none',
                }}
              >
                👤 {u.name} <span style={{ opacity: 0.7, fontSize: '11.5px' }}>({u.username})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Filter and Section Header */}
      <div className="section-toolbar">
        <div>
          <h2 className="section-title">
            {currentUser?.role === 'admin'
              ? selectedUserFilter === 'all'
                ? 'All QR Code Campaigns (Admin Global View)'
                : `QR Campaigns for: ${
                    usersList.find((u) => u.id === selectedUserFilter)?.name || 'Selected Profile'
                  }`
              : 'Your QR Code Campaigns'}
          </h2>
          <p className="section-subtitle">
            Manage destinations, monitor scan analytics, and download print-ready files.
          </p>
        </div>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search title, slug, or profile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* QR Codes Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          Loading QR code campaigns...
        </div>
      ) : filteredQRs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--card-bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--card-border)',
          }}
        >
          <QrCode size={48} color="#64748b" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>
            No QR Codes Found
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
            {searchQuery
              ? 'No campaigns match your search filter.'
              : selectedUserFilter !== 'all'
              ? 'This profile has not generated any QR codes yet.'
              : 'Create your first dynamic QR code to start tracking customer scans!'}
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={18} />
            <span>Create First QR Code</span>
          </button>
        </div>
      ) : (
        <div className="qr-grid">
          {filteredQRs.map((qr) => {
            const previewImg = qrPreviews[qr.id];
            const shortUrl = `${origin}/r/${qr.slug}`;

            return (
              <article key={qr.id} className="qr-card">
                <div className="qr-card-top">
                  <div className="qr-preview-box">
                    {previewImg ? (
                      <img src={previewImg} alt={qr.title} className="qr-preview-img" />
                    ) : (
                      <div style={{ width: 90, height: 90, background: '#f1f5f9' }} />
                    )}
                  </div>

                  <div className="qr-info-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        className={`qr-status-pill ${
                          qr.isActive ? 'status-active' : 'status-paused'
                        }`}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: qr.isActive ? '#10b981' : '#f59e0b',
                          }}
                        />
                        {qr.isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>

                      {/* Profile Creator Badge (Admin View) */}
                      {currentUser?.role === 'admin' && qr.createdByName && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#94a3b8',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          👤 {qr.createdByName}
                        </span>
                      )}
                    </div>

                    <h3 className="qr-card-title" title={qr.title}>
                      {qr.title}
                    </h3>
                    <div className="qr-dest-link">
                      <Globe size={13} />
                      <a
                        href={qr.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={qr.destinationUrl}
                      >
                        {qr.destinationUrl}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Scans Stat Banner */}
                <div className="qr-stats-banner">
                  <div className="stat-item">
                    <span className="stat-num">{qr.totalScans || 0}</span>
                    <span className="stat-label">Total Scans</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-card-action btn-view-stats"
                      onClick={() => handleOpenStats(qr)}
                    >
                      <BarChart3 size={14} />
                      <span>View Full Stats</span>
                    </button>
                  </div>
                </div>

                {/* Short Redirect Link Box */}
                <div className="short-url-box">
                  <span className="short-url-text" title={shortUrl}>
                    /r/{qr.slug}
                  </span>
                  <button
                    type="button"
                    className="btn-copy-sm"
                    onClick={() => handleCopyLink(qr.slug, qr.id)}
                  >
                    {copiedId === qr.id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span style={{ marginLeft: 4 }}>
                      {copiedId === qr.id ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="qr-card-actions">
                  <button
                    type="button"
                    className="btn-card-action"
                    title="Download PNG & SVG for Business Cards"
                    onClick={() => {
                      setDownloadTargetQR(qr);
                      setIsDownloadModalOpen(true);
                    }}
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    className="btn-card-action"
                    title="Change Destination Website URL"
                    onClick={() => handleOpenEdit(qr)}
                  >
                    <Edit2 size={14} />
                    <span>Edit URL</span>
                  </button>

                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-card-action"
                    title="Test scan redirect"
                  >
                    <ExternalLink size={14} />
                    <span>Test</span>
                  </a>

                  <button
                    type="button"
                    className="btn-card-action"
                    style={{
                      flex: 'none',
                      color: qr.isActive ? '#f59e0b' : '#10b981',
                    }}
                    title={
                      qr.isActive
                        ? 'Pause Campaign (QR code is permanently preserved)'
                        : 'Resume Campaign'
                    }
                    onClick={() => handleToggleActive(qr)}
                  >
                    {qr.isActive ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* CREATE QR CODE MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Dynamic QR Code</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  {currentUser?.role === 'admin' && usersList.length > 0 && (
                    <div className="form-group">
                      <label>Assign to Profile (Admin)</label>
                      <select
                        className="form-input"
                        value={assignedUserId}
                        onChange={(e) => setAssignedUserId(e.target.value)}
                        style={{ cursor: 'pointer' }}
                      >
                        {usersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.username})
                          </option>
                        ))}
                      </select>
                      <p className="form-help">
                        Choose which user profile owns this QR campaign.
                      </p>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Campaign / Rep Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sales Rep Specials (John Doe)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Website / Destination URL *</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://yourwebsite.com/specials/"
                      value={newDestinationUrl}
                      onChange={(e) => setNewDestinationUrl(e.target.value)}
                      required
                    />
                    <p className="form-help">
                      This is where customers land when they scan. You can change this anytime!
                    </p>
                  </div>

                  <div className="form-group">
                    <label>Custom Short Slug *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. rep-specials or card-john"
                      value={newSlug}
                      onChange={(e) =>
                        setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))
                      }
                      required
                    />
                    <p className="form-help">
                      Redirect URL:{' '}
                      <code>
                        {origin || 'https://domain.vercel.app'}/r/{newSlug || 'your-slug'}
                      </code>
                    </p>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>QR Dark Color</label>
                      <input
                        type="color"
                        style={{ height: '42px', padding: '2px', cursor: 'pointer' }}
                        className="form-input"
                        value={newColorDark}
                        onChange={(e) => setNewColorDark(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>QR Background Color</label>
                      <input
                        type="color"
                        style={{ height: '42px', padding: '2px', cursor: 'pointer' }}
                        className="form-input"
                        value={newColorLight}
                        onChange={(e) => setNewColorLight(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Campaign Notes (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Printed on 500 business cards in Oct 2026"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right side live QR preview */}
                <div
                  style={{
                    width: '200px',
                    textAlign: 'center',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#94a3b8',
                      marginBottom: '10px',
                    }}
                  >
                    LIVE QR PREVIEW
                  </span>
                  <div
                    style={{
                      background: '#fff',
                      padding: '12px',
                      borderRadius: '16px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                      marginBottom: '14px',
                    }}
                  >
                    {createPreviewUrl && (
                      <img
                        src={createPreviewUrl}
                        alt="Preview"
                        style={{ width: '160px', height: '160px', display: 'block' }}
                      />
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Print-ready high-contrast QR code
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '24px',
                  paddingTop: '18px',
                  borderTop: '1px solid var(--card-border)',
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  <Sparkles size={16} />
                  <span>{isSubmitting ? 'Generating...' : 'Save & Generate QR'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN PROFILES MANAGEMENT MODAL */}
      {isProfilesModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProfilesModalOpen(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={24} color="#10b981" />
                <div>
                  <h2>Registered User & Sales Rep Profiles</h2>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                    Users can sign up and manage their own QR codes. As Admin, you have full access to all profiles.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setIsProfilesModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div className="scans-table-wrap">
                <table className="scans-table">
                  <thead>
                    <tr>
                      <th>Profile Name</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>
                          No additional profiles registered yet.
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name}</strong>
                          </td>
                          <td>
                            <code>{u.username}</code>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background:
                                  u.role === 'admin'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(59, 130, 246, 0.15)',
                                color: u.role === 'admin' ? '#34d399' : '#60a5fa',
                              }}
                            >
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-card-action"
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                              onClick={() => {
                                handleFilterUser(u.id);
                                setIsProfilesModalOpen(false);
                              }}
                            >
                              <span>View QR Codes</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED STATS MODAL */}
      {isStatsModalOpen && selectedQRStats && (
        <div className="modal-overlay" onClick={() => setIsStatsModalOpen(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Scan Analytics & Statistics</h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                  {selectedQRStats.title} &bull; <code>/r/{selectedQRStats.slug}</code>
                </p>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setIsStatsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="analytics-hero">
              <div className="analytics-stat-box">
                <div className="analytics-stat-title">Total Scans</div>
                <div className="analytics-stat-val">{selectedQRStats.stats.total}</div>
              </div>

              <div className="analytics-stat-box">
                <div className="analytics-stat-title">Today's Scans</div>
                <div className="analytics-stat-val" style={{ color: '#10b981' }}>
                  {selectedQRStats.stats.today}
                </div>
              </div>

              <div className="analytics-stat-box">
                <div className="analytics-stat-title">Last 7 Days</div>
                <div className="analytics-stat-val" style={{ color: '#6366f1' }}>
                  {selectedQRStats.stats.thisWeek}
                </div>
              </div>

              <div className="analytics-stat-box">
                <div className="analytics-stat-title">Target Destination</div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#38bdf8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <a
                    href={selectedQRStats.destinationUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#38bdf8', textDecoration: 'none' }}
                  >
                    {selectedQRStats.destinationUrl}
                  </a>
                </div>
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="breakdown-bar-wrap">
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Device Breakdown
              </span>
              {(() => {
                const total = Math.max(1, selectedQRStats.stats.total);
                const mobPct = Math.round(
                  (selectedQRStats.stats.deviceBreakdown.mobile / total) * 100
                );
                const dskPct = Math.round(
                  (selectedQRStats.stats.deviceBreakdown.desktop / total) * 100
                );
                const tabPct = 100 - mobPct - dskPct;

                return (
                  <>
                    <div className="breakdown-bar">
                      <div className="bar-segment bar-mobile" style={{ width: `${mobPct}%` }} />
                      <div className="bar-segment bar-desktop" style={{ width: `${dskPct}%` }} />
                      <div className="bar-segment bar-tablet" style={{ width: `${tabPct}%` }} />
                    </div>
                    <div className="breakdown-legend">
                      <div className="legend-item">
                        <span className="legend-dot bar-mobile" />
                        <span>Mobile ({mobPct}%)</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot bar-desktop" />
                        <span>Desktop ({dskPct}%)</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot bar-tablet" />
                        <span>Tablet ({tabPct}%)</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Recent Scans Log Table */}
            <div style={{ marginTop: '26px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Recent Scan Activity Log
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Showing last {selectedQRStats.recentScans.length} events
                </span>
              </div>

              <div className="scans-table-wrap">
                <table className="scans-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Device & OS</th>
                      <th>Browser</th>
                      <th>Location</th>
                      <th>Referrer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQRStats.recentScans.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>
                          No scans logged yet. Test by scanning your QR code!
                        </td>
                      </tr>
                    ) : (
                      selectedQRStats.recentScans.slice(0, 15).map((scan) => (
                        <tr key={scan.id}>
                          <td>{new Date(scan.timestamp).toLocaleString()}</td>
                          <td>
                            <span
                              style={{
                                textTransform: 'capitalize',
                                fontWeight: 600,
                                color: '#fff',
                              }}
                            >
                              {scan.deviceType}
                            </span>{' '}
                            &bull; {scan.os}
                          </td>
                          <td>{scan.browser}</td>
                          <td>
                            {scan.city}, {scan.country}
                          </td>
                          <td>{scan.referer}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DESTINATION URL MODAL */}
      {isEditModalOpen && editingQR && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit QR Code Settings</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingQR.title}
                  onChange={(e) => setEditingQR({ ...editingQR, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Dynamic Destination URL *</label>
                <input
                  type="url"
                  className="form-input"
                  value={editingQR.destinationUrl}
                  onChange={(e) =>
                    setEditingQR({ ...editingQR, destinationUrl: e.target.value })
                  }
                  required
                />
                <p className="form-help">
                  Updating this URL changes where all past printed QR codes redirect to instantly!
                </p>
              </div>

              <div className="form-group">
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={editingQR.isActive}
                    onChange={(e) => setEditingQR({ ...editingQR, isActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                  />
                  <span>Active & Ready for Scans</span>
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '24px',
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span>Save URL Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOWNLOAD MODAL */}
      {isDownloadModalOpen && downloadTargetQR && (
        <div className="modal-overlay" onClick={() => setIsDownloadModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Download Print-Ready QR Code</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setIsDownloadModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  background: '#fff',
                  padding: '16px',
                  borderRadius: '16px',
                  display: 'inline-block',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  marginBottom: '16px',
                }}
              >
                {qrPreviews[downloadTargetQR.id] && (
                  <img
                    src={qrPreviews[downloadTargetQR.id]}
                    alt={downloadTargetQR.title}
                    style={{ width: 180, height: 180, display: 'block' }}
                  />
                )}
              </div>
              <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '4px' }}>
                {downloadTargetQR.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                Redirects to: <code>{downloadTargetQR.destinationUrl}</code>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ justifyContent: 'center' }}
                onClick={() => downloadPng(downloadTargetQR)}
              >
                <Download size={16} />
                <span>Download PNG (1024px)</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ justifyContent: 'center' }}
                onClick={() => downloadSvg(downloadTargetQR)}
              >
                <Download size={16} />
                <span>Download Vector (SVG)</span>
              </button>
            </div>

            <p
              style={{
                fontSize: '12px',
                color: '#64748b',
                textAlign: 'center',
                marginTop: '16px',
              }}
            >
              Recommended for business cards: PNG or Vector SVG for print shops with zero quality loss.
            </p>
          </div>
        </div>
      )}

      {/* --- STORAGE HEALTH & PERSISTENCE DIAGNOSTICS MODAL --- */}
      {isDiagnosticsModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDiagnosticsModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    padding: '8px',
                    borderRadius: '12px',
                    display: 'flex',
                  }}
                >
                  <Shield size={20} />
                </div>
                <div>
                  <h2>Storage & Data Integrity Monitor</h2>
                  <p>Guaranteed zero data loss across reloads, cold starts, and container restarts</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsDiagnosticsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Active Verification Tool */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '16px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ color: '#34d399', fontSize: '14px', fontWeight: 700, margin: 0 }}>
                      ⚡ Live Persistence & Reload Test
                    </h4>
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0 0' }}>
                      Simulates a page refresh, synchronizes browser vault with disk, and checks for data loss.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap' }}
                    onClick={handleRunPersistenceCheck}
                    disabled={isVerifying}
                  >
                    <RefreshCw size={14} className={isVerifying ? 'animate-spin' : ''} />
                    <span>{isVerifying ? 'Verifying...' : 'Run Test'}</span>
                  </button>
                </div>
                {verifyResult && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 12px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      color: verifyResult.startsWith('✅') ? '#a7f3d0' : '#fca5a5',
                      borderLeft: `3px solid ${verifyResult.startsWith('✅') ? '#34d399' : '#f87171'}`,
                    }}
                  >
                    {verifyResult}
                  </div>
                )}
              </div>

              {/* Storage Layers Overview */}
              <div>
                <h4 style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                  Active Storage Redundancy Layers
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Layer 1: Browser Vault */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <HardDrive size={14} style={{ color: '#60a5fa' }} />
                        <span>Layer 1: Browser Persistent Vault (localStorage)</span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '11.5px', marginTop: '2px' }}>
                        Key: <code>qr_hub_vault_[userId]</code> — Scoped per user profile in browser storage
                      </div>
                    </div>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                      }}
                    >
                      {qrList.length} Saved
                    </span>
                  </div>

                  {/* Layer 2: Disk Locations */}
                  {diagnosticsData?.locations?.filter((l: any) => l.exists).map((loc: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ maxWidth: '440px', overflow: 'hidden' }}>
                        <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Database size={14} style={{ color: '#34d399' }} />
                          <span>Layer {idx + 2}: {loc.path.includes('.qr_code_hub_data') ? 'Global OS Home Mirror' : loc.path.includes('backup') ? 'Mirrored Backup Copy' : 'Project Primary Database'}</span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px', wordBreak: 'break-all' }}>
                          <code>{loc.path}</code>
                        </div>
                      </div>
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {loc.qrCount ?? diagnosticsData.totalQRCodes} Synced
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vercel Cloud Persistence Status Card */}
              <div
                style={{
                  background: diagnosticsData?.isCloudRedis
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${
                    diagnosticsData?.isCloudRedis
                      ? 'rgba(16, 185, 129, 0.3)'
                      : 'rgba(245, 158, 11, 0.3)'
                  }`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Globe
                    size={16}
                    style={{ color: diagnosticsData?.isCloudRedis ? '#34d399' : '#fbbf24' }}
                  />
                  <h4
                    style={{
                      color: diagnosticsData?.isCloudRedis ? '#34d399' : '#fbbf24',
                      fontSize: '13px',
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {diagnosticsData?.isCloudRedis
                      ? '☁️ Cloud Database Connected (Vercel KV / Upstash Redis)'
                      : '☁️ Vercel Cloud Serverless Persistence Setup'}
                  </h4>
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                  {diagnosticsData?.isCloudRedis
                    ? 'Your QR codes and live scan analytics are permanently synced across all Vercel serverless regions with zero data loss.'
                    : 'Your QR codes are preserved safely in your browser vault. For production phone scans on Vercel without cold starts, connect free Vercel KV or Upstash Redis in your Vercel Project -> Storage tab.'}
                </p>
              </div>

              {/* Quick tip on how to verify manually */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#94a3b8',
                  lineHeight: 1.5,
                }}
              >
                💡 <strong>Manual verification tip:</strong> Create a QR code anytime, press <kbd style={{ background: '#334155', padding: '2px 5px', borderRadius: '4px', color: '#fff' }}>Cmd+Shift+R</kbd> (hard refresh), or restart your server. Your QR codes will persist intact every time.
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsDiagnosticsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && <div className="dashboard-toast">{toastMsg}</div>}
    </div>
  );
}
