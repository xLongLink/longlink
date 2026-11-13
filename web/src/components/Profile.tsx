import { cn } from 'cn';
import { api, ApiError } from '@/lib/api';
import { SidebarContext } from '@/lib/sidebar';
import { Avatar } from '@/components/ui/Avatar';
import { Divider } from '@/components/ui/Divider';
import { Link as RouterLink } from 'react-router';
import { adminNavigation } from '@/platform/admin';
import { isNetworkError, isTimeoutError } from 'ky';
import { useContext, useRef, useState } from 'react';
import { clearAppearanceCache } from '@/lib/appearance';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { Button, buttonVariants } from '@/components/shadcn/button';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import { BookOpen, Building2, ChevronsUpDown, ExternalLink, Settings2 } from 'lucide-react';

/** Renders a user profile popover with authentication and navigation actions. */
export function ProfileMenu() {
    const user = useAuthenticatedUser();
    const sidebar = useContext(SidebarContext);
    const [isOpen, setIsOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const [unexpectedError, setUnexpectedError] = useState<{ cause: unknown } | null>(null);
    const inFlight = useRef(false);
    const closeMenu = () => setIsOpen(false);

    // Keep programming failures visible to the nearest React error boundary.
    if (unexpectedError !== null) throw unexpectedError.cause;

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
                setUnexpectedError({ cause });
            }

            inFlight.current = false;
            setPending(false);

            return;
        }

        clearAppearanceCache();
        window.location.assign('/user/organizations');
    }

    const identity = (
        <>
            <Avatar size="sm" src={user.avatar} name={user.name} seed={user.id} />
            <span className="flex min-w-0 flex-1 flex-col text-start leading-tight">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
        </>
    );

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen} modal="trap-focus">
            <PopoverTrigger
                type="button"
                aria-label={user.name}
                render={
                    <Button
                        variant="ghost"
                        size={sidebar === 'expanded' ? 'lg' : 'icon-lg'}
                        className={cn(sidebar === 'expanded' && 'w-full min-w-0 justify-start text-start')}
                    />
                }
                data-expanded={sidebar === 'expanded' || undefined}
            >
                {sidebar === 'expanded' ? (
                    <>
                        {identity}
                        <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" size={16} />
                    </>
                ) : (
                    <Avatar size="sm" src={user.avatar} name={user.name} seed={user.id} />
                )}
            </PopoverTrigger>
            <PopoverContent
                className="max-h-(--available-height) max-w-(--available-width) overflow-y-auto"
                side={sidebar === null ? 'bottom' : 'top'}
                align={sidebar === null ? 'end' : 'start'}
                sideOffset={4}
                aria-label={user.name}
            >
                <section className="flex min-w-0 items-center gap-2">{identity}</section>
                <Divider />
                <nav aria-label="Account" className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">Account</p>
                    <RouterLink
                        className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}
                        to="/user/organizations"
                        onClickCapture={closeMenu}
                    >
                        <Building2 aria-hidden="true" className="text-muted-foreground" size={16} />
                        Organizations
                    </RouterLink>
                    <RouterLink
                        className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}
                        to="/user/settings"
                        onClickCapture={closeMenu}
                    >
                        <Settings2 aria-hidden="true" className="text-muted-foreground" size={16} />
                        Settings
                    </RouterLink>
                    <a
                        className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}
                        href="/docs/"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClickCapture={closeMenu}
                    >
                        <BookOpen aria-hidden="true" className="text-muted-foreground" size={16} />
                        Documentation
                        <ExternalLink aria-hidden="true" className="ms-auto text-muted-foreground" size={12} />
                    </a>
                </nav>
                {user.administrator ? (
                    <>
                        <Divider />
                        <nav aria-label="Administration" className="flex flex-col gap-1">
                            <p className="text-xs font-medium text-muted-foreground">Administration</p>
                            {adminNavigation.map(({ href, icon: Icon, label }) => (
                                <RouterLink
                                    key={href}
                                    className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}
                                    to={href}
                                    onClickCapture={closeMenu}
                                >
                                    <Icon aria-hidden="true" className="text-muted-foreground" size={16} />
                                    {label}
                                </RouterLink>
                            ))}
                        </nav>
                        <Divider />
                    </>
                ) : null}
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
                <Button
                    variant="destructive"
                    type="button"
                    disabled={pending}
                    aria-busy={pending || undefined}
                    onClick={() => void signOut()}
                >
                    {pending ? 'Signing out…' : error ? 'Retry sign out' : 'Sign out'}
                </Button>
                <PopoverPrimitive.Close
                    type="button"
                    render={<Button variant="ghost" />}
                    className="sr-only focus:not-sr-only"
                >
                    Close profile menu
                </PopoverPrimitive.Close>
            </PopoverContent>
        </Popover>
    );
}
