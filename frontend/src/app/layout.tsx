import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Massive Scale Chat',
  description: 'Real-time chat application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} relative min-h-screen`}> 
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-[10%] h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -top-32 right-[8%] h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/25 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[140px]" />
        </div>
        <div className="relative">
          {children}
        </div>
      </body>
    </html>
  );
}
