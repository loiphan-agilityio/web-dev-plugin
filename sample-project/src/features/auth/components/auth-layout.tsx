import { Outlet } from 'react-router';

/** Bare shell for the sign-in pages: no sidebar or header, since there is no user yet. */
export function AuthLayout() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </main>
  );
}
