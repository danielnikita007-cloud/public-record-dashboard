import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Public Record — Investigative Dashboard',
  description: 'Sourced, attributed tracking of public-interest cases across India.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body">
        <header className="border-b border-gold/30 bg-ink sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-semibold text-paper">The Public Record</span>
              <span className="font-mono text-[10px] text-gold tracking-widest uppercase">Sourced · Attributed · Verified</span>
            </Link>
            <nav className="font-mono text-xs uppercase tracking-wide text-paper/70 flex gap-5">
              <Link href="/" className="hover:text-gold">Topics</Link>
              <Link href="/admin/submit" className="hover:text-gold">Submit a case</Link>
              <Link href="/admin/review" className="hover:text-gold">Review queue</Link>
            </nav>
          </div>
        </header>
        <main className="min-h-screen bg-ink">{children}</main>
        <footer className="border-t border-gold/20 bg-ink">
          <div className="max-w-6xl mx-auto px-6 py-8 font-mono text-[11px] text-paper/50 leading-relaxed">
            Every case on this site is attributed to a named source — a government record, a court filing, or a
            named journalist/outlet — and reflects what that source reported, not a finding by this publication.
            See <Link href="/methodology" className="underline hover:text-gold">Methodology & Corrections</Link>.
          </div>
        </footer>
      </body>
    </html>
  );
}
