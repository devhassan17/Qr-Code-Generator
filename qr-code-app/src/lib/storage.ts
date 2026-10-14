import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';
import { QRCodeItem, ScanEvent } from './types';

interface DatabaseSchema {
  qrCodes: QRCodeItem[];
  scans: ScanEvent[];
}

// Global cache in memory for speed
const globalForDb = globalThis as unknown as {
  __qrDbCache?: DatabaseSchema;
};

// Check for Vercel KV / Upstash Redis environment variables
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const REDIS_DB_KEY = 'qr_hub_database_v1';

function getLocalStoragePath(): string {
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
      totalScans: 42,
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
      totalScans: 19,
    },
  ];

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
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
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
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
    });
  }

  return { qrCodes: initialQRs, scans: initialScans };
}

/**
 * Load Database:
 * 1. Reads from Cloud Database (Upstash Redis / Vercel KV) if connected.
 * 2. Falls back to local persistent disk file if offline/local dev.
 */
async function loadDatabase(): Promise<DatabaseSchema> {
  // If Cloud Database is connected, fetch live data
  if (redis) {
    try {
      const cloudData = await redis.get<DatabaseSchema>(REDIS_DB_KEY);
      if (cloudData && Array.isArray(cloudData.qrCodes) && Array.isArray(cloudData.scans)) {
        globalForDb.__qrDbCache = cloudData;
        return cloudData;
      } else {
        // Initialize cloud database with initial seed
        const seed = getInitialSeed();
        await redis.set(REDIS_DB_KEY, seed);
        globalForDb.__qrDbCache = seed;
        return seed;
      }
    } catch (err) {
      console.warn('Error reading from Cloud Redis, falling back to local:', err);
    }
  }

  // Local filesystem fallback
  if (globalForDb.__qrDbCache) {
    return globalForDb.__qrDbCache;
  }

  const filePath = getLocalStoragePath();
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
    console.warn('Local read error:', err);
  }

  const seed = getInitialSeed();
  await saveDatabase(seed);
  return seed;
}

/**
 * Save Database:
 * 1. Saves to Cloud Database (Upstash Redis / Vercel KV) permanently.
 * 2. Updates local cache and disk.
 */
async function saveDatabase(data: DatabaseSchema): Promise<void> {
  globalForDb.__qrDbCache = data;

  // Save to Cloud Database
  if (redis) {
    try {
      await redis.set(REDIS_DB_KEY, data);
    } catch (err) {
      console.error('Error writing to Cloud Redis:', err);
    }
  }

  // Save to local disk
  try {
    const filePath = getLocalStoragePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // ignore local disk write errors on serverless
  }
}

export const Storage = {
  async isUsingCloudDatabase(): Promise<boolean> {
    return redis !== null;
  },

  async getAllQRCodes(): Promise<QRCodeItem[]> {
    const db = await loadDatabase();
    return db.qrCodes;
  },

  async getQRCodeBySlug(slug: string): Promise<QRCodeItem | undefined> {
    const db = await loadDatabase();
    return db.qrCodes.find((item) => item.slug.toLowerCase() === slug.toLowerCase());
  },

  async getQRCodeById(id: string): Promise<QRCodeItem | undefined> {
    const db = await loadDatabase();
    return db.qrCodes.find((item) => item.id === id);
  },

  async createQRCode(data: Omit<QRCodeItem, 'id' | 'createdAt' | 'updatedAt' | 'totalScans'>): Promise<QRCodeItem> {
    const db = await loadDatabase();
    const now = new Date().toISOString();
    const newQR: QRCodeItem = {
      ...data,
      id: `qr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      totalScans: 0,
    };

    db.qrCodes.unshift(newQR);
    await saveDatabase(db);
    return newQR;
  },

  async updateQRCode(id: string, updates: Partial<Omit<QRCodeItem, 'id' | 'createdAt'>>): Promise<QRCodeItem | null> {
    const db = await loadDatabase();
    const index = db.qrCodes.findIndex((item) => item.id === id);
    if (index === -1) return null;

    db.qrCodes[index] = {
      ...db.qrCodes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await saveDatabase(db);
    return db.qrCodes[index];
  },

  /**
   * NEVER DELETED:
   * To prevent data loss and broken business cards, campaigns are archived/paused
   * rather than permanently dropped.
   */
  async deleteQRCode(id: string): Promise<boolean> {
    const db = await loadDatabase();
    const qr = db.qrCodes.find((item) => item.id === id);
    if (qr) {
      qr.isActive = false;
      qr.updatedAt = new Date().toISOString();
      await saveDatabase(db);
      return true;
    }
    return false;
  },

  async recordScan(scanData: Omit<ScanEvent, 'id' | 'timestamp'>): Promise<ScanEvent> {
    const db = await loadDatabase();
    const event: ScanEvent = {
      ...scanData,
      id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    db.scans.unshift(event);

    const qrIndex = db.qrCodes.findIndex((item) => item.id === scanData.qrCodeId);
    if (qrIndex !== -1) {
      db.qrCodes[qrIndex].totalScans = (db.qrCodes[qrIndex].totalScans || 0) + 1;
      db.qrCodes[qrIndex].updatedAt = new Date().toISOString();
    }

    await saveDatabase(db);
    return event;
  },

  async getScansForQRCode(qrCodeId: string): Promise<ScanEvent[]> {
    const db = await loadDatabase();
    return db.scans.filter((scan) => scan.qrCodeId === qrCodeId);
  },

  async getAllScans(): Promise<ScanEvent[]> {
    const db = await loadDatabase();
    return db.scans;
  },

  async exportDatabase(): Promise<DatabaseSchema> {
    return await loadDatabase();
  },
};
