import { cn } from 'cn';
import { api, ApiError } from '@/lib/api';
import { SidebarContext } from '@/lib/sidebar';
import { Link as RouterLink } from 'react-router';
import { adminNavigation } from '@/platform/admin';
import { isNetworkError, isTimeoutError } from 'ky';
import { useContext, useRef, useState } from 'react';
import { clearAppearanceCache } from '@/lib/appearance';
import { useErrorBoundary } from 'react-error-boundary';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { Avatar } from '@/components/longlink/display/avatar';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { Button, buttonVariants } from '@/components/longlink/action/button';
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
    const sidebar = useContext(SidebarContext);
    const [isOpen, setIsOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const { showBoundary } = useErrorBoundary();
    const inFlight = useRef(false);
    const closeMenu = () => setIsOpen(false);

    async function signOut() {
        if (inFlight.current) return;
        inFlight.current = true;
        closeMenu();
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

    // Keep the same avatar size in expanded and collapsed sidebar controls.
    const avatar = <Avatar size={sidebar === null ? 'sm' : 'md'} src={user.avatar} name={user.name} />;

    const identity = (
        <>
            {avatar}
            <span className="flex min-w-0 flex-1 flex-col text-start leading-tight">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
        </>
    );

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger
                type="button"
                aria-label={user.name}
                render={
                    sidebar === null ? (
                        <Button variant="ghost" size="icon-lg" />
                    ) : (
                        <ButtonPrimitive
                            className={cn(
                                buttonVariants({ variant: 'ghost', size: null }),
                                'border-0',
                                sidebar === 'expanded'
                                    ? 'w-full min-w-0 justify-start gap-2 p-2 text-start'
                                    : 'size-10 p-1'
                            )}
                        />
                    )
                }
                data-expanded={sidebar === 'expanded' || undefined}
            >
                {sidebar === 'expanded' ? (
                    <>
                        {identity}
                        <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" size={16} />
                    </>
                ) : (
                    avatar
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="min-w-56"
                side={sidebar === null ? 'bottom' : 'top'}
                align={sidebar === null ? 'end' : 'start'}
                sideOffset={4}
                aria-label={user.name}
            >
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex min-w-0 items-center gap-2">{identity}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup aria-label="Account">
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuItem render={<RouterLink to="/user/organizations" />} onClickCapture={closeMenu}>
                        <Building2 aria-hidden="true" className="text-muted-foreground" size={16} />
                        Organizations
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<RouterLink to="/user/settings" />} onClickCapture={closeMenu}>
                        <Settings2 aria-hidden="true" className="text-muted-foreground" size={16} />
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        render={<a href="/docs/" target="_blank" rel="noopener noreferrer" />}
                        onClickCapture={closeMenu}
                    >
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
                                <DropdownMenuItem
                                    key={href}
                                    render={<RouterLink to={href} />}
                                    onClickCapture={closeMenu}
                                >
                                    <Icon aria-hidden="true" className="text-muted-foreground" size={16} />
                                    {label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                    </>
                ) : null}
                <DropdownMenuSeparator />
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
                <DropdownMenuItem disabled={pending} aria-busy={pending || undefined} onClick={() => void signOut()}>
                    <LogOut aria-hidden="true" />
                    {pending ? 'Signing out…' : error ? 'Retry sign out' : 'Sign out'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
