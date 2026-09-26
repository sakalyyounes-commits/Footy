import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Toaster } from '../components/ui/toast';
import { cx } from '../lib/misc';
import { BOTTOM_NAV, MODULES, SIDEBAR } from './nav';

export function LogoMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span className={cx('logo-mark', className)} aria-hidden>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="6" y="6" width="12" height="12" rx="1.5" />
        <rect x="6" y="6" width="12" height="12" rx="1.5" transform="rotate(45 12 12)" />
        <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Navigation principale">
      <Link to="/" className="sidebar-brand">
        <LogoMark />
        <div>
          <strong>Hayati</strong>
          <span>Ma vie en équilibre</span>
        </div>
      </Link>
      {SIDEBAR.map((group, i) => (
        <div key={group.title ?? i}>
          {group.title && <div className="nav-section">{group.title}</div>}
          {group.items.map((m) => (
            <NavLink key={m.to} to={m.to} end={m.to === '/'} className={({ isActive }) => cx('nav-link', `accent-${m.accent}`, isActive && 'active')}>
              <span className="nav-dot">
                <m.icon size={16} />
              </span>
              {m.label}
            </NavLink>
          ))}
        </div>
      ))}
      <div className="nav-section">Application</div>
      <NavLink to={MODULES.settings.to} className={({ isActive }) => cx('nav-link', 'accent-tasks', isActive && 'active')}>
        <span className="nav-dot">
          <MODULES.settings.icon size={16} />
        </span>
        {MODULES.settings.label}
      </NavLink>
      <p className="sidebar-footer">Vos données restent sur cet appareil.</p>
    </nav>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {BOTTOM_NAV.map(({ module: m, label, match }) => {
        const active = match.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)));
        return (
          <Link key={m.to} to={m.to} className={cx(active && 'active')} aria-current={active ? 'page' : undefined}>
            <span className="nav-icon">
              <m.icon size={22} strokeWidth={active ? 2.3 : 1.9} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
      <BottomNav />
      <Toaster />
    </div>
  );
}
