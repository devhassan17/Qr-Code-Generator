import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QR Code Generator & Real-Time Analytics Dashboard',
  description: 'Generate dynamic QR codes for your websites, sales reps, and promotions with real-time scan analytics and tracking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="ambient-glow-1"></div>
        <div className="ambient-glow-2"></div>
        {children}
      </body>
    </html>
  );
}
