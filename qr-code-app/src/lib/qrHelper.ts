import QRCode from 'qrcode';

export interface QRRenderOptions {
  width?: number;
  margin?: number;
  colorDark?: string;
  colorLight?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export async function generateQRDataUrl(
  text: string,
  options: QRRenderOptions = {}
): Promise<string> {
  const {
    width = 300,
    margin = 2,
    colorDark = '#0f172a',
    colorLight = '#ffffff',
    errorCorrectionLevel = 'H'
  } = options;

  return QRCode.toDataURL(text, {
    width,
    margin,
    color: {
      dark: colorDark,
      light: colorLight
    },
    errorCorrectionLevel
  });
}

export async function generateQRSvg(
  text: string,
  options: QRRenderOptions = {}
): Promise<string> {
  const {
    margin = 2,
    colorDark = '#0f172a',
    colorLight = '#ffffff',
    errorCorrectionLevel = 'H'
  } = options;

  return QRCode.toString(text, {
    type: 'svg',
    margin,
    color: {
      dark: colorDark,
      light: colorLight
    },
    errorCorrectionLevel
  });
}
