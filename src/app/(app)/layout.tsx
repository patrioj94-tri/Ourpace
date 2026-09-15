import Link from 'next/link';
import { TabBar } from '@/components/TabBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="appbar">
        <Link href="/" className="wordmark">
          Our<span>&nbsp;Pace</span>
        </Link>
        <Link href="/settings" className="appbar-action">
          Settings
        </Link>
      </header>
      <main className="page">{children}</main>
      <TabBar />
    </div>
  );
}
