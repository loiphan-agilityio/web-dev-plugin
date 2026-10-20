import { Link, Outlet } from 'react-router';

export const RootLayout = () => (
  <div className="min-h-svh bg-background text-foreground">
    <header className="border-b">
      <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
        <Link to="/" className="font-heading font-semibold">
          app-template
        </Link>
      </nav>
    </header>
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Outlet />
    </main>
  </div>
);
