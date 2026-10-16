import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';
import { QRCodeItem, ScanEvent, UserProfile } from './types';

export interface DatabaseSchema {
  users: UserProfile[];
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

/**
 * Returns all potential persistent storage directories across local development,
 * root vs subfolder executions, user home directory, and serverless environments.
 */
function getStorageDirectories(): string[] {
  const dirs: string[] = [];

  try {
    // 1. Current working directory /data
    dirs.push(path.join(process.cwd(), 'data'));

    // 2. Subfolder /data if cwd is root
    dirs.push(path.join(process.cwd(), 'qr-code-app', 'data'));

    // 3. Parent /data if cwd is qr-code-app
    dirs.push(path.join(process.cwd(), '..', 'data'));

    // 4. User home directory (.qr_code_hub_data) - 100% persistent on Mac/Linux/Windows
    if (process.env.HOME || process.env.USERPROFILE) {
      dirs.push(path.join(process.env.HOME || process.env.USERPROFILE || '', '.qr_code_hub_data'));
    }

    // 5. Serverless /tmp fallback
    dirs.push('/tmp/qr_analytics_data');
  } catch (err) {
    dirs.push('/tmp/qr_analytics_data');
  }

  return Array.from(new Set(dirs));
}

function getInitialSeed(): DatabaseSchema {
  const now = new Date();
  const twoDaysAgo = new Date(Date.now() - 172800000);

  const initialUsers: UserProfile[] = [
    {
      id: 'usr_admin',
      username: 'admin',
      name: 'Administrator',
      password: 'Qwerty123!@#',
      role: 'admin',
      createdAt: twoDaysAgo.toISOString(),
    },
    {
      id: 'usr_rep_1',
      username: 'mikerep',
      name: 'Mike Stevens (Rep)',
      password: 'Rep123!',
      role: 'user',
      createdAt: twoDaysAgo.toISOString(),
    },
  ];

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
      createdByUserId: 'usr_rep_1',
      createdByName: 'Mike Stevens (Rep)',
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
      createdByUserId: 'usr_admin',
      createdByName: 'Administrator',
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

  return { users: initialUsers, qrCodes: initialQRs, scans: initialScans };
}

/**
 * Merge two database states, ensuring zero data loss:
 * Combines QR codes, scans, and users by unique IDs and slugs.
 */
function mergeDatabaseStates(primary: DatabaseSchema, secondary: DatabaseSchema): DatabaseSchema {
  const qrMap = new Map<string, QRCodeItem>();
  const slugMap = new Map<string, QRCodeItem>();

  // Add primary QR codes
  if (Array.isArray(primary.qrCodes)) {
    for (const qr of primary.qrCodes) {
      if (qr && qr.id) {
        qrMap.set(qr.id, qr);
        if (qr.slug) slugMap.set(qr.slug.toLowerCase(), qr);
      }
    }
  }

  // Merge secondary QR codes
  if (Array.isArray(secondary.qrCodes)) {
    for (const qr of secondary.qrCodes) {
      if (qr && qr.id) {
        if (!qrMap.has(qr.id) && (!qr.slug || !slugMap.has(qr.slug.toLowerCase()))) {
          qrMap.set(qr.id, qr);
          if (qr.slug) slugMap.set(qr.slug.toLowerCase(), qr);
        }
      }
    }
  }

  // Merge Users
  const userMap = new Map<string, UserProfile>();
  if (Array.isArray(primary.users)) {
    for (const u of primary.users) {
      if (u && u.id) userMap.set(u.id, u);
    }
  }
  if (Array.isArray(secondary.users)) {
    for (const u of secondary.users) {
      if (u && u.id && !userMap.has(u.id)) {
        userMap.set(u.id, u);
      }
    }
  }

  // Merge Scans
  const scanMap = new Map<string, ScanEvent>();
  if (Array.isArray(primary.scans)) {
    for (const s of primary.scans) {
      if (s && s.id) scanMap.set(s.id, s);
    }
  }
  if (Array.isArray(secondary.scans)) {
    for (const s of secondary.scans) {
      if (s && s.id && !scanMap.has(s.id)) {
        scanMap.set(s.id, s);
      }
    }
  }

  const mergedUsers = Array.from(userMap.values());
  if (!mergedUsers.some((u) => u.username.toLowerCase() === 'admin')) {
    mergedUsers.unshift(getInitialSeed().users[0]);
  }

  return {
    users: mergedUsers,
    qrCodes: Array.from(qrMap.values()),
    scans: Array.from(scanMap.values()),
  };
}

/**
 * Load Database:
 * 1. Reads from Cloud Database (Upstash Redis / Vercel KV) if available.
 * 2. Scans all persistent local storage paths and selects the state with the most QR codes.
 * 3. Merges and updates memory and disk so user client QR codes are NEVER deleted.
 */
async function loadDatabase(): Promise<DatabaseSchema> {
  let bestCandidate: DatabaseSchema | null = null;

  // 1. Check Cloud Database (Upstash Redis)
  if (redis) {
    try {
      const cloudData = await redis.get<DatabaseSchema>(REDIS_DB_KEY);
      if (cloudData && Array.isArray(cloudData.qrCodes)) {
        bestCandidate = cloudData;
      }
    } catch (err) {
      console.warn('Error reading from Cloud Redis:', err);
    }
  }

  // 2. Scan all local storage directories
  const dirs = getStorageDirectories();
  for (const dir of dirs) {
    const candidateFiles = [
      path.join(dir, 'db.json'),
      path.join(dir, 'db.backup.json'),
    ];

    for (const filePath of candidateFiles) {
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.qrCodes)) {
            if (!bestCandidate) {
              bestCandidate = parsed;
            } else {
              // Merge to never lose newly created items
              bestCandidate = mergeDatabaseStates(bestCandidate, parsed);
            }
          }
        }
      } catch (err) {
        // Continue scanning other candidates
      }
    }
  }

  // 3. Merge with in-memory cache if it holds additional data
  if (globalForDb.__qrDbCache && Array.isArray(globalForDb.__qrDbCache.qrCodes)) {
    if (!bestCandidate) {
      bestCandidate = globalForDb.__qrDbCache;
    } else {
      bestCandidate = mergeDatabaseStates(bestCandidate, globalForDb.__qrDbCache);
    }
  }

  // 4. Fallback to initial seed if nothing exists yet
  if (!bestCandidate || !Array.isArray(bestCandidate.qrCodes) || bestCandidate.qrCodes.length === 0) {
    bestCandidate = getInitialSeed();
  }

  // Ensure admin user exists
  if (!Array.isArray(bestCandidate.users)) {
    bestCandidate.users = getInitialSeed().users;
  }
  if (!bestCandidate.users.some((u) => u.username.toLowerCase() === 'admin')) {
    bestCandidate.users.unshift(getInitialSeed().users[0]);
  }

  // Update in-memory cache
  globalForDb.__qrDbCache = bestCandidate;

  // Mirror bestCandidate to all available writable paths in background
  saveDatabase(bestCandidate).catch(() => {});

  return bestCandidate;
}

/**
 * Save Database:
 * Atomically writes to Cloud Database and ALL local storage paths with backup copy.
 */
async function saveDatabase(data: DatabaseSchema): Promise<void> {
  globalForDb.__qrDbCache = data;

  // 1. Save to Cloud Database
  if (redis) {
    try {
      await redis.set(REDIS_DB_KEY, data);
    } catch (err) {
      console.error('Error writing to Cloud Redis:', err);
    }
  }

  // 2. Mirror save to all local storage directories
  const jsonContent = JSON.stringify(data, null, 2);
  const dirs = getStorageDirectories();

  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const mainFile = path.join(dir, 'db.json');
      const backupFile = path.join(dir, 'db.backup.json');

      // Write atomically using temporary file to prevent corruption
      const tempFile = path.join(dir, `db.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`);
      fs.writeFileSync(tempFile, jsonContent, 'utf-8');
      fs.renameSync(tempFile, mainFile);

      // Keep backup file synchronized
      fs.writeFileSync(backupFile, jsonContent, 'utf-8');
    } catch (err) {
      // Ignore write errors on read-only environments
    }
  }
}

export const Storage = {
  async isUsingCloudDatabase(): Promise<boolean> {
    return redis !== null;
  },

  // --- Users & Profiles ---
  async getAllUsers(): Promise<UserProfile[]> {
    const db = await loadDatabase();
    return db.users.map(({ password, ...u }) => u as UserProfile);
  },

  async getUserById(id: string): Promise<UserProfile | undefined> {
    const db = await loadDatabase();
    return db.users.find((u) => u.id === id);
  },

  async getUserByUsername(username: string): Promise<UserProfile | undefined> {
    const db = await loadDatabase();
    return db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  },

  async createUser(data: {
    username: string;
    name: string;
    password: string;
    role?: 'admin' | 'user';
  }): Promise<UserProfile> {
    const db = await loadDatabase();
    const cleanUsername = data.username.trim().toLowerCase();
    if (db.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      throw new Error('Username is already taken');
    }

    const newUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      name: data.name.trim(),
      password: data.password,
      role: data.role || 'user',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    await saveDatabase(db);
    return newUser;
  },

  // --- QR Codes ---
  async getAllQRCodes(filterUserId?: string): Promise<QRCodeItem[]> {
    const db = await loadDatabase();
    if (filterUserId && filterUserId !== 'all') {
      return db.qrCodes.filter((item) => item.createdByUserId === filterUserId);
    }
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

  async createQRCode(
    data: Omit<QRCodeItem, 'id' | 'createdAt' | 'updatedAt' | 'totalScans'>
  ): Promise<QRCodeItem> {
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

  async updateQRCode(
    id: string,
    updates: Partial<Omit<QRCodeItem, 'id' | 'createdAt'>>
  ): Promise<QRCodeItem | null> {
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

  /**
   * Merge external client vault QR codes to prevent loss on reload / container restarts
   */
  async syncExternalQRCodes(clientQRs: QRCodeItem[]): Promise<QRCodeItem[]> {
    if (!Array.isArray(clientQRs) || clientQRs.length === 0) {
      return this.getAllQRCodes();
    }

    const db = await loadDatabase();
    let hasChanges = false;

    for (const cQR of clientQRs) {
      if (!cQR || !cQR.slug) continue;
      const existing = db.qrCodes.find(
        (q) => q.id === cQR.id || q.slug.toLowerCase() === cQR.slug.toLowerCase()
      );

      if (!existing) {
        db.qrCodes.unshift({
          ...cQR,
          id: cQR.id || `qr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          createdAt: cQR.createdAt || new Date().toISOString(),
          updatedAt: cQR.updatedAt || new Date().toISOString(),
          totalScans: cQR.totalScans || 0,
        });
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await saveDatabase(db);
    }

    return db.qrCodes;
  },

  // --- Scans & Analytics ---
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

  async getAllScans(filterUserId?: string): Promise<ScanEvent[]> {
    const db = await loadDatabase();
    if (filterUserId && filterUserId !== 'all') {
      const userQRs = new Set(
        db.qrCodes
          .filter((item) => item.createdByUserId === filterUserId)
          .map((item) => item.id)
      );
      return db.scans.filter((scan) => userQRs.has(scan.qrCodeId));
    }
    return db.scans;
  },

  async exportDatabase(): Promise<DatabaseSchema> {
    return await loadDatabase();
  },

  async importDatabase(importedData: Partial<DatabaseSchema>): Promise<boolean> {
    const db = await loadDatabase();
    const merged = mergeDatabaseStates(db, {
      users: importedData.users || [],
      qrCodes: importedData.qrCodes || [],
      scans: importedData.scans || [],
    });
    await saveDatabase(merged);
    return true;
  },
};
