export interface ParsedUA {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
}

export function parseUserAgent(uaString: string | null): ParsedUA {
  if (!uaString) {
    return { deviceType: 'desktop', os: 'Unknown OS', browser: 'Unknown Browser' };
  }

  const ua = uaString.toLowerCase();

  // Device detection
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle/i.test(ua)) {
    deviceType = 'mobile';
  }

  // OS detection
  let os = 'Other';
  if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // Browser detection
  let browser = 'Other';
  if (/edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/chrome|crios/i.test(ua) && !/opr|opera|edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    browser = 'Safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/opr|opera/i.test(ua)) {
    browser = 'Opera';
  }

  return { deviceType, os, browser };
}
