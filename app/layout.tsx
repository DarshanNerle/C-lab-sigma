import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'C-Lab Sigma | Chemistry Lab Platform',
  description: 'A production-grade chemistry lab platform for students and teachers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen font-sans bg-lab-dark text-white">
        {children}
      </body>
    </html>
  );
}
