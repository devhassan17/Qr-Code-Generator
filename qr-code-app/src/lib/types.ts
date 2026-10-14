export interface QRCodeItem {
  id: string;
  title: string;
  slug: string;
  destinationUrl: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  notes?: string;
  colorDark: string;
  colorLight: string;
  totalScans: number;
}

export interface ScanEvent {
  id: string;
  qrCodeId: string;
  slug: string;
  timestamp: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  country: string;
  city: string;
  referer: string;
  userAgent: string;
}

export interface QRCodeWithStats extends QRCodeItem {
  recentScans: ScanEvent[];
  stats: {
    total: number;
    today: number;
    thisWeek: number;
    deviceBreakdown: {
      mobile: number;
      desktop: number;
      tablet: number;
    };
    browserBreakdown: Record<string, number>;
    osBreakdown: Record<string, number>;
    timeline: { date: string; count: number }[];
  };
}
