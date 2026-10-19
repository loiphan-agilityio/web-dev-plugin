import type { CSSProperties } from 'react';
import { Outlet } from 'react-router';

import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function RootLayout() {
  return (
    <SidebarProvider style={{ '--sidebar-width': '20rem' } as CSSProperties}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
