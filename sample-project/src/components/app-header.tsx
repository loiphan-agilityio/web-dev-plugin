import {
  AppWindow,
  Bell,
  CreditCard,
  LifeBuoy,
  LinkIcon,
  LogOut,
  Plus,
  QrCode,
  Search,
  Settings,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { Form, Link, useLoaderData, useNavigate } from 'react-router';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLogout } from '@/features/auth/queries';
import type { Session } from '@/lib/session';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
});

const greetingFor = (hour: number) =>
  hour < 12
    ? { emoji: '☀️', text: 'Good morning' }
    : hour < 18
      ? { emoji: '🌤️', text: 'Good afternoon' }
      : { emoji: '🌙', text: 'Good evening' };

const menuItemClass =
  'gap-2 rounded-none px-3.5 py-2.5 text-sm font-semibold text-popover-foreground [&_svg:not([class*=size-])]:size-5';
const iconButtonClass =
  'size-10 rounded-md text-muted-foreground [&_svg:not([class*=size-])]:size-5';
const createItems = [
  { title: 'Link', url: '/links/new', icon: LinkIcon, shortcut: '⌘ + L' },
  { title: 'QR Code', url: '/qr-codes/new', icon: QrCode, shortcut: '⌘ + G' },
  { title: 'Page', url: '/pages/new', icon: AppWindow, shortcut: '⌘ + P' },
];
const accountItems = [
  { title: 'My account', url: '/account', icon: User },
  { title: 'Notifications', url: '/notifications', icon: Bell },
  { title: 'Billing & Plan', url: '/billing', icon: CreditCard },
  { title: 'Settings', url: '/settings', icon: Settings },
];

function UserAvatar({ initials }: { readonly initials: string }) {
  return (
    <Avatar size="lg">
      <AvatarFallback className="bg-avatar text-base font-bold text-avatar-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function AppHeader() {
  // The root route's loader guarantees a session (see src/app/routes.tsx).
  const { email } = useLoaderData<Session>();
  // The API has no profile endpoint or name field, so the email stands in for the name.
  const firstName = email.split('@')[0] ?? email;
  const initials = firstName.charAt(0).toUpperCase();
  const navigate = useNavigate();
  const logout = useLogout();
  // shortcut: read once on mount, so the greeting does not roll over until a remount
  const [now] = useState(() => new Date());
  const greeting = greetingFor(now.getHours());

  return (
    <header className="flex h-18 items-center gap-2.5 border-b border-sidebar-border px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex min-w-0 flex-1 items-start gap-1">
        <span aria-hidden className="text-base font-bold">
          {greeting.emoji}
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-base font-bold text-foreground">
            {`${greeting.text}, ${firstName}`}
          </p>
          <p className="text-xs text-muted-foreground">{dateFormat.format(now)}</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-10 gap-1 rounded-md px-3.5 font-semibold [&_svg:not([class*=size-])]:size-5">
            <Plus />
            Create new
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 p-0">
          {createItems.map((item) => (
            <DropdownMenuItem key={item.url} asChild className={menuItemClass}>
              <Link to={item.url}>
                <item.icon />
                {item.title}
                {/* Hint only: not bound, ⌘L/⌘G/⌘P belong to the browser. */}
                <DropdownMenuShortcut
                  aria-hidden
                  className="rounded-sm border border-sidebar-border px-1 py-0.5 text-[10px] font-semibold tracking-normal"
                >
                  {item.shortcut}
                </DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Form action="/links" role="search" className="hidden w-60 lg:block">
        <InputGroup className="h-10 rounded-md shadow-xs">
          <InputGroupAddon className="pl-3.5">
            <Search className="size-5" />
          </InputGroupAddon>
          <InputGroupInput
            name="q"
            placeholder="Search links"
            aria-label="Search links"
            className="h-full"
          />
        </InputGroup>
      </Form>

      <Button asChild variant="ghost" size="icon" className={iconButtonClass}>
        <Link to="/notifications" aria-label="Notifications">
          <Bell />
        </Link>
      </Button>
      <Button asChild variant="ghost" size="icon" className={iconButtonClass}>
        <Link to="/support" aria-label="Support">
          <LifeBuoy />
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <UserAvatar initials={initials} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 p-0">
          <DropdownMenuLabel className="flex items-center gap-2 border-b border-sidebar-border px-3.5 py-3">
            <UserAvatar initials={initials} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-popover-foreground">
                {email}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">Free account</span>
            </div>
            <Badge className="h-auto rounded-sm bg-success px-2 py-1 text-[10px] font-bold text-success-foreground">
              Upgrade
            </Badge>
          </DropdownMenuLabel>
          {accountItems.map((item) => (
            <DropdownMenuItem key={item.url} asChild className={menuItemClass}>
              <Link to={item.url}>
                <item.icon />
                {item.title}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="m-0 bg-sidebar-border" />
          <DropdownMenuItem
            disabled={logout.isPending}
            className={menuItemClass}
            onSelect={() => {
              // Navigate once the sign-out has settled: the /login guard bounces anyone who
              // still has a session, and onSettled is what clears it.
              logout.mutate(undefined, {
                onSettled: () => {
                  void navigate('/login', { replace: true });
                },
              });
            }}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
