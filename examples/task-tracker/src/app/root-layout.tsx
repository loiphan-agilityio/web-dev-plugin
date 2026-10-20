import { NavLink, Outlet } from 'react-router';

import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-full items-center border-b-2 text-sm transition-colors',
    isActive
      ? 'border-primary text-primary'
      : 'border-transparent text-muted-foreground hover:text-foreground',
  );

export const RootLayout = () => (
  <div className="min-h-svh bg-background text-foreground">
    <header className="border-b bg-card">
      <nav className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <NavLink to="/" className="flex items-center gap-3 font-heading font-semibold">
          <span aria-hidden="true" className="size-5 rounded-md bg-primary" />
          task-tracker
        </NavLink>
        <NavLink to="/" end className={navLinkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/tasks" className={navLinkClass}>
          Tasks
        </NavLink>
      </nav>
    </header>
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Outlet />
    </main>
  </div>
);
