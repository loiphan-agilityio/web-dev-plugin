import { NavLink, Outlet } from 'react-router';

import { cn } from '@/lib/utils';

const links = [
  { to: '/loans', label: 'Loans' },
  { to: '/books', label: 'Books' },
  { to: '/members', label: 'Members' },
  { to: '/overview', label: 'Overview' },
];

export const RootLayout = () => (
  <div className="min-h-svh bg-background text-foreground">
    <header className="border-b">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
      >
        <NavLink to="/" className="font-heading font-semibold">
          library-manager
        </NavLink>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'text-sm text-muted-foreground hover:text-foreground',
                isActive && 'font-medium text-foreground',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Outlet />
    </main>
  </div>
);
