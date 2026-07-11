import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F9FAFB' }}>
      <div className="text-center">
        <p className="text-6xl font-bold mb-4" style={{ color: '#D4A017' }}>404</p>
        <h1 className="text-xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-white/40 text-sm mb-8">This page doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: '#C1272D' }}>
            Go home
          </Link>
          <Link href="/marketplace" className="px-5 py-2.5 rounded-xl text-sm border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all">
            Browse vehicles
          </Link>
        </div>
      </div>
    </div>
  );
}
