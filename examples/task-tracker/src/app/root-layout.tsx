import { Link, NavLink, Outlet } from 'react-router';

import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-full items-center border-b-2 text-sm transition-colors',
    isActive
      ? 'border-primary text-primary'
      : 'border-transparent text-muted-foreground hover:text-foreground',
  );

export function RootLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-card">
        <nav className="flex h-15 items-stretch gap-6 px-4 sm:px-12">
          <Link to="/" className="flex items-center gap-2 font-heading font-semibold">
            <span aria-hidden="true" className="size-5.5 rounded-md bg-primary" />
            task-tracker
          </Link>
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/tasks" className={navLinkClass}>
            Tasks
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
