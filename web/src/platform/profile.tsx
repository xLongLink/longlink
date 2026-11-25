import { useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Link as RouterLink } from 'react-router';
import { adminNavigation } from '@/platform/admin';
import { isNetworkError, isTimeoutError } from 'ky';
import { clearAppearanceCache } from '@/lib/appearance';
import { useErrorBoundary } from 'react-error-boundary';
import { Text } from '@/components/longlink/display/text';
import { Avatar } from '@/components/longlink/display/avatar';
import { SidebarMenuButton } from '@/components/shadcn/sidebar';
import { useAuthenticatedUser } from '@/platform/hooks/use-user';
import { BookOpen, Building2, ChevronsUpDown, ExternalLink, LogOut, Settings2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

/** Renders a user profile menu with authentication and navigation actions. */
export function ProfileMenu() {
    const user = useAuthenticatedUser();
    const [isOpen, setIsOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const { showBoundary } = useErrorBoundary();
    const inFlight = useRef(false);

    async function signOut() {
        if (inFlight.current) return;
        inFlight.current = true;
        setIsOpen(false);
        setPending(true);
        setError('');

        // Only confirmed logout may discard the account's startup preference and authenticated page.
        try {
            await api('/api/v1/auth/logout', { method: 'POST' });
        } catch (cause) {
            if (cause instanceof ApiError || isNetworkError(cause) || isTimeoutError(cause)) {
                setError('Sign out failed. Please try again.');
                setIsOpen(true);
            } else {
                showBoundary(cause);
            }

            inFlight.current = false;
            setPending(false);

            return;
        }

        clearAppearanceCache();
        window.location.assign('/user/organizations');
    }

    const avatar = <Avatar size="md" src={user.avatar} name={user.name} />;

    const identity = (
        <>
            {avatar}
            <span className="flex min-w-0 flex-1 flex-col text-start leading-tight">
                <Text maxLines={1} size="sm" weight="medium">
                    {user.name}
                </Text>
                <Text maxLines={1} size="xs" tone="muted">
                    {user.email}
                </Text>
            </span>
        </>
    );

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger type="button" aria-label={user.name} render={<SidebarMenuButton size="lg" />}>
                {avatar}
                <span className="flex min-w-0 flex-1 flex-col text-start leading-tight group-data-[collapsible=icon]:hidden">
                    <Text maxLines={1} size="sm" weight="medium">
                        {user.name}
                    </Text>
                    <Text maxLines={1} size="xs" tone="muted">
                        {user.email}
                    </Text>
                </span>
                <ChevronsUpDown
                    aria-hidden="true"
                    className="text-muted-foreground group-data-[collapsible=icon]:hidden"
                    size={16}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56" side="top" align="end" sideOffset={4} aria-label={user.name}>
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex min-w-0 items-center gap-2">{identity}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup aria-label="Account">
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuItem render={<RouterLink to="/user/organizations" />}>
                        <Building2 aria-hidden="true" className="text-muted-foreground" size={16} />
                        Organizations
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<RouterLink to="/user/settings" />}>
                        <Settings2 aria-hidden="true" className="text-muted-foreground" size={16} />
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<a href="/docs/" target="_blank" rel="noopener noreferrer" />}>
                        <BookOpen aria-hidden="true" className="text-muted-foreground" size={16} />
                        Documentation
                        <ExternalLink aria-hidden="true" className="ms-auto text-muted-foreground" size={12} />
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                {user.administrator ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup aria-label="Administration">
                            <DropdownMenuLabel>Administration</DropdownMenuLabel>
                            {adminNavigation.map(({ href, icon: Icon, label }) => (
                                <DropdownMenuItem key={href} render={<RouterLink to={href} />}>
                                    <Icon aria-hidden="true" className="text-muted-foreground" size={16} />
                                    {label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                    </>
                ) : null}
                <DropdownMenuSeparator />
                {error && (
                    <Text as="p" role="alert" size="sm" tone="destructive">
                        {error}
                    </Text>
                )}
                <DropdownMenuItem disabled={pending} aria-busy={pending || undefined} onClick={() => void signOut()}>
                    <LogOut aria-hidden="true" />
                    {pending ? 'Signing out…' : error ? 'Retry sign out' : 'Sign out'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
