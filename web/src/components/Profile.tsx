import { api, ApiError } from '@/lib/api';
import { SidebarContext } from '@/lib/sidebar';
import { Avatar } from '@/components/ui/Avatar';
import { Popover } from '@base-ui/react/popover';
import { Divider } from '@/components/ui/Divider';
import { Link as RouterLink } from 'react-router';
import { adminNavigation } from '@/platform/admin';
import { Button } from '@/components/shadcn/button';
import { isNetworkError, isTimeoutError } from 'ky';
import { useContext, useRef, useState } from 'react';
import { clearAppearanceCache } from '@/lib/appearance';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
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
            <Avatar src={user.avatar} name={user.name} seed={user.id} />
            <span className="profile-identity-text">
                <span className="profile-name">{user.name}</span>
                <span className="profile-email">{user.email}</span>
            </span>
        </>
    );

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen} modal="trap-focus">
            <Popover.Trigger
                type="button"
                aria-label={user.name}
                className="profile-trigger"
                data-expanded={sidebar === 'expanded' || undefined}
            >
                {sidebar === 'expanded' ? (
                    <>
                        {identity}
                        <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" size={16} />
                    </>
                ) : (
                    <Avatar src={user.avatar} name={user.name} seed={user.id} />
                )}
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner
                    className="profile-positioner"
                    side={sidebar === null ? 'bottom' : 'top'}
                    align={sidebar === null ? 'end' : 'start'}
                    sideOffset={4}
                >
                    <Popover.Popup className="profile-popup" aria-label={user.name}>
                        <section className="profile-identity">{identity}</section>
                        <Divider />
                        <nav aria-label="Account" className="profile-links">
                            <p className="profile-heading">Account</p>
                            <RouterLink className="profile-link" to="/user/organizations" onClickCapture={closeMenu}>
                                <Building2 aria-hidden="true" className="text-muted-foreground" size={16} />
                                Organizations
                            </RouterLink>
                            <RouterLink className="profile-link" to="/user/settings" onClickCapture={closeMenu}>
                                <Settings2 aria-hidden="true" className="text-muted-foreground" size={16} />
                                Settings
                            </RouterLink>
                            <a
                                className="profile-link"
                                href="/docs/"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClickCapture={closeMenu}
                            >
                                <BookOpen aria-hidden="true" className="text-muted-foreground" size={16} />
                                Documentation
                                <ExternalLink
                                    aria-hidden="true"
                                    className="profile-external text-muted-foreground"
                                    size={12}
                                />
                            </a>
                        </nav>
                        {user.administrator ? (
                            <>
                                <Divider />
                                <nav aria-label="Administration" className="profile-links">
                                    <p className="profile-heading">Administration</p>
                                    {adminNavigation.map(({ href, icon: Icon, label }) => (
                                        <RouterLink
                                            key={href}
                                            className="profile-link"
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
                            <p role="alert" className="profile-error">
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
                        <Popover.Close className="sr-only focus:not-sr-only">Close profile menu</Popover.Close>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
