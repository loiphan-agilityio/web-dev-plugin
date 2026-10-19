import {
  AppWindow,
  ArrowRight,
  ChevronDown,
  Globe,
  House,
  LifeBuoy,
  LinkIcon,
  type LucideIcon,
  QrCode,
  Settings,
  TrendingUp,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import logoMark from '@/assets/logo-mark.svg';
import logoWordmark from '@/assets/logo-wordmark.svg';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

type NavLeaf = { title: string; url: string; icon: LucideIcon; badge?: string };
type NavBranch = {
  title: string;
  icon: LucideIcon;
  items: readonly { title: string; url: string }[];
};

const primaryNav: readonly (NavLeaf | NavBranch)[] = [
  { title: 'Dashboard', url: '/', icon: House },
  {
    title: 'Links',
    icon: LinkIcon,
    items: [
      { title: 'All links', url: '/links' },
      { title: 'Create link', url: '/links/new' },
    ],
  },
  {
    title: 'QR Codes',
    icon: QrCode,
    items: [
      { title: 'All QR codes', url: '/qr-codes' },
      { title: 'Create QR code', url: '/qr-codes/new' },
    ],
  },
  {
    title: 'Pages',
    icon: AppWindow,
    items: [
      { title: 'All pages', url: '/pages' },
      { title: 'Create page', url: '/pages/new' },
    ],
  },
  { title: 'Analytics', url: '/analytics', icon: TrendingUp },
  { title: 'Domains', url: '/domains', icon: Globe, badge: 'Upgrade' },
];

const secondaryNav: readonly NavLeaf[] = [
  { title: 'Support', url: '/support', icon: LifeBuoy },
  { title: 'Settings', url: '/settings', icon: Settings },
];

// shortcut: static placeholder, replace with a usage query via integrate-api when the endpoint exists
const usage = { used: 8, limit: 10 };

const navButtonClass =
  'h-10 gap-2 rounded-lg px-3.5 text-sm font-semibold data-active:font-semibold [&>svg:first-child]:size-5';
const groupClass = 'border-b border-sidebar-border px-6 py-4';

function NavLeafItem({ item, pathname }: { readonly item: NavLeaf; readonly pathname: string }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname === item.url} className={navButtonClass}>
        <NavLink to={item.url} end>
          <item.icon />
          <span>{item.title}</span>
          {item.badge ? (
            <Badge className="ml-auto h-auto rounded-sm bg-success px-2 py-1 text-[10px] font-bold text-success-foreground">
              {item.badge}
            </Badge>
          ) : null}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavBranchItem({
  item,
  pathname,
}: {
  readonly item: NavBranch;
  readonly pathname: string;
}) {
  return (
    <Collapsible
      asChild
      className="group/collapsible"
      defaultOpen={item.items.some((sub) => sub.url === pathname)}
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className={navButtonClass}>
            <item.icon />
            <span>{item.title}</span>
            <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((sub) => (
              <SidebarMenuSubItem key={sub.url}>
                <SidebarMenuSubButton asChild isActive={pathname === sub.url}>
                  <NavLink to={sub.url} end>
                    <span>{sub.title}</span>
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const [usageDismissed, setUsageDismissed] = useState(false);

  return (
    <Sidebar className="border-sidebar-border">
      <SidebarHeader className="p-6">
        <Link to="/" className="flex items-center gap-2 rounded-sm">
          <img src={logoMark} alt="" />
          <img src={logoWordmark} alt="Shortener" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNav.map((item) =>
                'items' in item ? (
                  <NavBranchItem key={item.title} item={item} pathname={pathname} />
                ) : (
                  <NavLeafItem key={item.title} item={item} pathname={pathname} />
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <NavLeafItem key={item.title} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {usageDismissed ? null : (
        <SidebarFooter className="p-6">
          <div className="relative flex flex-col gap-2 rounded-xl bg-muted p-4">
            <p className="pr-6 text-base font-semibold text-foreground">
              {usage.limit - usage.used}/{usage.limit} links available
            </p>
            <p className="text-xs text-muted-foreground">
              Enjoying Shortener? Consider upgrading your plan so you can go limitless.
            </p>
            <Progress
              value={(usage.used / usage.limit) * 100}
              aria-label="Links used"
              className="h-2 bg-border"
            />
            <Button asChild variant="link" className="h-auto w-fit p-0 font-semibold">
              <Link to="/billing">
                Upgrade now
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Dismiss"
              className="absolute top-3.5 right-3.5 text-muted-foreground"
              onClick={() => {
                setUsageDismissed(true);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
