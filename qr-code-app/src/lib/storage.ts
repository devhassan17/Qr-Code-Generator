import fs from 'fs';
import path from 'path';
import { QRCodeItem, ScanEvent } from './types';

interface DatabaseSchema {
  qrCodes: QRCodeItem[];
  scans: ScanEvent[];
}

// Global cache in memory for serverless execution
const globalForDb = globalThis as unknown as {
  __qrDbCache?: DatabaseSchema;
};

// Determine storage path (falls back to /tmp if read-only filesystem on Vercel)
function getStoragePath(): string {
  try {
    const localDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, 'db.json');
  } catch {
    return '/tmp/qr_analytics_db.json';
  }
}

function getInitialSeed(): DatabaseSchema {
  const now = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 172800000);

  const initialQRs: QRCodeItem[] = [
    {
      id: 'qr_specials_1',
      title: 'Sales Rep Deals & Specials',
      slug: 'rep-specials',
      destinationUrl: 'https://example.com/specials/',
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: now.toISOString(),
      isActive: true,
      notes: 'Printed on sales rep business cards and table tents',
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      totalScans: 42
    },
    {
      id: 'qr_main_site',
      title: 'Company Main Homepage',
      slug: 'main-site',
      destinationUrl: 'https://example.com',
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: now.toISOString(),
      isActive: true,
      notes: 'General marketing banner QR',
      colorDark: '#047857',
      colorLight: '#ffffff',
      totalScans: 19
    }
  ];

  // Seed realistic scan events
  const initialScans: ScanEvent[] = [];
  const devices: ('mobile' | 'desktop' | 'tablet')[] = ['mobile', 'mobile', 'mobile', 'mobile', 'desktop', 'tablet'];
  const osList = ['iOS', 'iOS', 'Android', 'Android', 'macOS', 'Windows'];
  const browsers = ['Safari', 'Safari', 'Chrome', 'Chrome', 'Firefox'];
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'];

  for (let i = 0; i < 42; i++) {
    const scanTime = new Date(Date.now() - Math.floor(Math.random() * 172800000));
    initialScans.push({
      id: `scan_${i + 1}`,
      qrCodeId: 'qr_specials_1',
      slug: 'rep-specials',
      timestamp: scanTime.toISOString(),
      deviceType: devices[i % devices.length],
      os: osList[i % osList.length],
      browser: browsers[i % browsers.length],
      country: 'US',
      city: cities[i % cities.length],
      referer: 'Direct / Camera Scan',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    });
  }

  for (let i = 0; i < 19; i++) {
    const scanTime = new Date(Date.now() - Math.floor(Math.random() * 172800000));
    initialScans.push({
      id: `scan_main_${i + 1}`,
      qrCodeId: 'qr_main_site',
      slug: 'main-site',
      timestamp: scanTime.toISOString(),
      deviceType: devices[i % devices.length],
      os: osList[i % osList.length],
      browser: browsers[i % browsers.length],
      country: 'US',
      city: cities[i % cities.length],
      referer: 'Flyer Scan',
      userAgent: 'Mozilla/5.0 (Linux; Android 14)'
    });
  }

  return { qrCodes: initialQRs, scans: initialScans };
}

function loadDatabase(): DatabaseSchema {
  if (globalForDb.__qrDbCache) {
    return globalForDb.__qrDbCache;
  }

  const filePath = getStoragePath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.qrCodes) && Array.isArray(parsed.scans)) {
        globalForDb.__qrDbCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read db file, initializing seed:', err);
  }

  const seed = getInitialSeed();
  saveDatabase(seed);
  return seed;
}

function saveDatabase(data: DatabaseSchema): void {
  globalForDb.__qrDbCache = data;
  const filePath = getStoragePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write db file to disk:', err);
  }
}

export const Storage = {
  getAllQRCodes(): QRCodeItem[] {
    const db = loadDatabase();
    return db.qrCodes;
  },

  getQRCodeBySlug(slug: string): QRCodeItem | undefined {
    const db = loadDatabase();
    return db.qrCodes.find(item => item.slug.toLowerCase() === slug.toLowerCase());
  },

  getQRCodeById(id: string): QRCodeItem | undefined {
    const db = loadDatabase();
    return db.qrCodes.find(item => item.id === id);
  },

  createQRCode(data: Omit<QRCodeItem, 'id' | 'createdAt' | 'updatedAt' | 'totalScans'>): QRCodeItem {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const newQR: QRCodeItem = {
      ...data,
      id: `qr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      totalScans: 0
    };

    db.qrCodes.unshift(newQR);
    saveDatabase(db);
    return newQR;
  },

  updateQRCode(id: string, updates: Partial<Omit<QRCodeItem, 'id' | 'createdAt'>>): QRCodeItem | null {
    const db = loadDatabase();
    const index = db.qrCodes.findIndex(item => item.id === id);
    if (index === -1) return null;

    db.qrCodes[index] = {
      ...db.qrCodes[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    saveDatabase(db);
    return db.qrCodes[index];
  },

  deleteQRCode(id: string): boolean {
    const db = loadDatabase();
    const initialLen = db.qrCodes.length;
    db.qrCodes = db.qrCodes.filter(item => item.id !== id);
    db.scans = db.scans.filter(scan => scan.qrCodeId !== id);
    if (db.qrCodes.length !== initialLen) {
      saveDatabase(db);
      return true;
    }
    return false;
  },

  recordScan(scanData: Omit<ScanEvent, 'id' | 'timestamp'>): ScanEvent {
    const db = loadDatabase();
    const event: ScanEvent = {
      ...scanData,
      id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };

    db.scans.unshift(event);

    // Increment count on the matching QR code
    const qrIndex = db.qrCodes.findIndex(item => item.id === scanData.qrCodeId);
    if (qrIndex !== -1) {
      db.qrCodes[qrIndex].totalScans = (db.qrCodes[qrIndex].totalScans || 0) + 1;
      db.qrCodes[qrIndex].updatedAt = new Date().toISOString();
    }

    saveDatabase(db);
    return event;
  },

  getScansForQRCode(qrCodeId: string): ScanEvent[] {
    const db = loadDatabase();
    return db.scans.filter(scan => scan.qrCodeId === qrCodeId);
  },

  getAllScans(): ScanEvent[] {
    const db = loadDatabase();
    return db.scans;
  }
};
