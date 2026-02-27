import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'autoManage',
  description: 'Local-first management dashboard for TasteKit agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
