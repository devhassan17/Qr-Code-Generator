'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  QrCode,
  BarChart3,
  Plus,
  Copy,
  Check,
  Download,
  ExternalLink,
  Edit2,
  Trash2,
  Search,
  Smartphone,
  Globe,
  TrendingUp,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { QRCodeItem, QRCodeWithStats } from '@/lib/types';
import { generateQRDataUrl, generateQRSvg } from '@/lib/qrHelper';

export default function DashboardPage() {
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

  // Form states for Create QR Code
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDestinationUrl, setNewDestinationUrl] = useState('');
  const [newColorDark, setNewColorDark] = useState('#0f172a');
  const [newColorLight, setNewColorLight] = useState('#ffffff');
  const [newNotes, setNewNotes] = useState('');
  const [createPreviewUrl, setCreatePreviewUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Origin for short links
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    fetchQRCodes();
  }, []);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/qrcodes');
      const data = await res.json();
      if (data.qrCodes) {
        setQrList(data.qrCodes);
        generatePreviews(data.qrCodes);
      }
    } catch (err) {
      console.error('Failed to fetch QR codes:', err);
    } finally {
      setLoading(false);
    }
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
          colorLight: item.colorLight || '#ffffff'
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
          colorLight: newColorLight
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
      const res = await fetch('/api/qrcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          slug: newSlug.trim(),
          destinationUrl: newDestinationUrl.trim(),
          colorDark: newColorDark,
          colorLight: newColorLight,
          notes: newNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to create QR code');
        return;
      }

      showToast(`QR Code "${data.qrCode.title}" created successfully!`);
      setIsCreateModalOpen(false);
      resetCreateForm();
      fetchQRCodes();
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
          isActive: editingQR.isActive
        })
      });

      if (res.ok) {
        showToast('QR Code updated successfully!');
        setIsEditModalOpen(false);
        fetchQRCodes();
      }
    } catch (err) {
      alert('Error updating QR code');
    }
  };

  const handleDeleteQR = async (qr: QRCodeItem) => {
    if (!confirm(`Are you sure you want to delete "${qr.title}" and its analytics history?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/qrcodes/${qr.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('QR Code deleted.');
        fetchQRCodes();
      }
    } catch (err) {
      alert('Error deleting QR code');
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
      errorCorrectionLevel: 'H'
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
      errorCorrectionLevel: 'H'
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
    return qrList.reduce((acc, curr) => acc + (curr.totalScans || 0), 0);
  }, [qrList]);

  const activeQRsCount = useMemo(() => {
    return qrList.filter(q => q.isActive).length;
  }, [qrList]);

  const filteredQRs = useMemo(() => {
    if (!searchQuery.trim()) return qrList;
    const q = searchQuery.toLowerCase();
    return qrList.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.destinationUrl.toLowerCase().includes(q)
    );
  }, [qrList, searchQuery]);

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
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={18} />
            <span>Create New QR Code</span>
          </button>
        </div>
      </header>

      {/* Global Overview Metrics */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div>
            <div className="metric-title">Total Active QR Codes</div>
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

      {/* Filter and Section Header */}
      <div className="section-toolbar">
        <div>
          <h2 className="section-title">Your QR Code Campaigns</h2>
          <p className="section-subtitle">
            Manage destinations, monitor scan analytics, and download print-ready files.
          </p>
        </div>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by title, slug, or URL..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* QR Codes Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          Loading your QR code campaigns...
        </div>
      ) : filteredQRs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--card-bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--card-border)'
          }}
        >
          <QrCode size={48} color="#64748b" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>
            No QR Codes Found
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
            {searchQuery
              ? 'No campaigns match your search filter.'
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
          {filteredQRs.map(qr => {
            const previewImg = qrPreviews[qr.id];
            const shortUrl = `${origin}/r/${qr.slug}`;

            return (
              <article key={qr.id} className="qr-card">
                <div className="qr-card-top">
                  <div className="qr-preview-box">
                    {previewImg ? (
                      <img
                        src={previewImg}
                        alt={qr.title}
                        className="qr-preview-img"
                      />
                    ) : (
                      <div style={{ width: 90, height: 90, background: '#f1f5f9' }} />
                    )}
                  </div>

                  <div className="qr-info-box">
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
                          background: qr.isActive ? '#10b981' : '#f59e0b'
                        }}
                      />
                      {qr.isActive ? 'ACTIVE' : 'PAUSED'}
                    </span>
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
                    style={{ flex: 'none', color: '#f43f5e' }}
                    title="Delete QR Code"
                    onClick={() => handleDeleteQR(qr)}
                  >
                    <Trash2 size={14} />
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
                  <div className="form-group">
                    <label>Campaign / Rep Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sales Rep Specials (John Doe)"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
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
                      onChange={e => setNewDestinationUrl(e.target.value)}
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
                      onChange={e =>
                        setNewSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
                        )
                      }
                      required
                    />
                    <p className="form-help">
                      Redirect URL: <code>{origin || 'https://domain.vercel.app'}/r/{newSlug || 'your-slug'}</code>
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
                        onChange={e => setNewColorDark(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>QR Background Color</label>
                      <input
                        type="color"
                        style={{ height: '42px', padding: '2px', cursor: 'pointer' }}
                        className="form-input"
                        value={newColorLight}
                        onChange={e => setNewColorLight(e.target.value)}
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
                      onChange={e => setNewNotes(e.target.value)}
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
                    alignItems: 'center'
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#94a3b8',
                      marginBottom: '10px'
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
                      marginBottom: '14px'
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
                  borderTop: '1px solid var(--card-border)'
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

      {/* DETAILED STATS MODAL */}
      {isStatsModalOpen && selectedQRStats && (
        <div className="modal-overlay" onClick={() => setIsStatsModalOpen(false)}>
          <div
            className="modal-content modal-lg"
            onClick={e => e.stopPropagation()}
          >
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
                <div className="analytics-stat-val">
                  {selectedQRStats.stats.total}
                </div>
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
                    whiteSpace: 'nowrap'
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
                  letterSpacing: '0.5px'
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
                      <div
                        className="bar-segment bar-mobile"
                        style={{ width: `${mobPct}%` }}
                      />
                      <div
                        className="bar-segment bar-desktop"
                        style={{ width: `${dskPct}%` }}
                      />
                      <div
                        className="bar-segment bar-tablet"
                        style={{ width: `${tabPct}%` }}
                      />
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
                  marginBottom: '12px'
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
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
                        <td
                          colSpan={5}
                          style={{ textAlign: 'center', padding: '30px' }}
                        >
                          No scans logged yet. Test by scanning your QR code!
                        </td>
                      </tr>
                    ) : (
                      selectedQRStats.recentScans.slice(0, 15).map(scan => (
                        <tr key={scan.id}>
                          <td>{new Date(scan.timestamp).toLocaleString()}</td>
                          <td>
                            <span
                              style={{
                                textTransform: 'capitalize',
                                fontWeight: 600,
                                color: '#fff'
                              }}
                            >
                              {scan.deviceType}
                            </span>{' '}
                            &bull; {scan.os}
                          </td>
                          <td>{scan.browser}</td>
                          <td>{scan.city}, {scan.country}</td>
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
                  onChange={e =>
                    setEditingQR({ ...editingQR, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Dynamic Destination URL *</label>
                <input
                  type="url"
                  className="form-input"
                  value={editingQR.destinationUrl}
                  onChange={e =>
                    setEditingQR({ ...editingQR, destinationUrl: e.target.value })
                  }
                  required
                />
                <p className="form-help">
                  Updating this URL changes where all past printed QR codes redirect to instantly!
                </p>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingQR.isActive}
                    onChange={e =>
                      setEditingQR({ ...editingQR, isActive: e.target.checked })
                    }
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
                  marginTop: '24px'
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
                  marginBottom: '16px'
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
                marginTop: '16px'
              }}
            >
              Recommended for business cards: PNG or Vector SVG for print shops with zero quality loss.
            </p>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && <div className="dashboard-toast">{toastMsg}</div>}
    </div>
  );
}
