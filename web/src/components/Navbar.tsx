import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Wordmark } from '@/components/Wordmark';
import { Link as RouterLink } from 'react-router';
import { Button } from '@/components/shadcn/button';
import { ExternalLink, Menu, X } from 'lucide-react';

const publicLinks = [
    { href: '/blog/', label: 'Blog' },
    { href: '/docs/', label: 'Documentation' },
    { href: '/pricing/', label: 'Pricing' },
];

/** Renders public navigation at the page's content width. */
export function Navbar({
    maxWidth = 1000,
    navigation,
    expandOnTop = false,
}: {
    maxWidth?: number;
    navigation?: ReactNode;
    expandOnTop?: boolean;
}) {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    // Close the mobile drawer when switching to desktop navigation.
    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 640px)');

        const onChange = () => {
            if (desktop.matches) setMenuOpen(false);
        };

        desktop.addEventListener('change', onChange);

        return () => desktop.removeEventListener('change', onChange);
    }, []);

    // Expand the landing navigation only while the page is at the top.
    useEffect(() => {
        if (!expandOnTop) return;
        const onScroll = () => setScrolled(window.scrollY > 0);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, [expandOnTop]);

    return (
        <header
            className={
                expandOnTop
                    ? `public-navbar sticky top-0 z-30 border-b ${scrolled ? 'border-border bg-background/50 backdrop-blur-sm' : 'border-transparent bg-transparent'}`
                    : 'public-navbar border-b border-border bg-background'
            }
        >
            <div className="public-navbar-content" style={{ maxWidth: expandOnTop && !scrolled ? '100%' : maxWidth }}>
                <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
                    <nav className="public-navbar-bar" aria-label="Main navigation">
                        <RouterLink to="/" aria-label="LongLink home" className="public-navbar-home">
                            <Wordmark size="heading" />
                        </RouterLink>
                        <div className="public-navbar-actions">
                            <div className="public-navbar-desktop">
                                <PublicLinks />
                            </div>
                            <Dialog.Trigger
                                className="public-navbar-toggle"
                                aria-label="Open navigation"
                                render={
                                    <Button
                                        variant="view"
                                        data-variant="ghost"
                                        data-size="md"
                                        data-icon-only
                                        type="button"
                                    />
                                }
                            >
                                <Menu aria-hidden="true" size={20} />
                            </Dialog.Trigger>
                        </div>
                    </nav>
                    <Dialog.Portal className="public-navbar-layer">
                        <Dialog.Backdrop className="public-navbar-backdrop" />
                        <Dialog.Popup
                            className="public-navbar-drawer"
                            aria-label="Main navigation"
                            finalFocus={() => !window.matchMedia('(min-width: 640px)').matches}
                        >
                            <div className="public-navbar-drawer-header">
                                <Dialog.Title className="public-navbar-title">Navigation</Dialog.Title>
                                <Dialog.Close
                                    aria-label="Close navigation"
                                    render={
                                        <Button
                                            variant="view"
                                            data-variant="ghost"
                                            data-size="md"
                                            data-icon-only
                                            type="button"
                                        />
                                    }
                                >
                                    <X aria-hidden="true" size={20} />
                                </Dialog.Close>
                            </div>
                            <div className="public-navbar-drawer-content">
                                <nav aria-label="Public pages" className="public-navbar-mobile">
                                    <PublicLinks mobile onNavigate={() => setMenuOpen(false)} />
                                </nav>
                            </div>
                        </Dialog.Popup>
                    </Dialog.Portal>
                </Dialog.Root>
                {navigation}
            </div>
        </header>
    );
}

/** Keeps public destinations and native link gestures identical in both navigation regions. */
function PublicLinks({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
    return (
        <>
            {publicLinks.map((link) => (
                <RouterLink key={link.href} className="public-navbar-link" to={link.href} onClick={onNavigate}>
                    {link.label}
                </RouterLink>
            ))}
            <a
                className="public-navbar-link"
                href="https://github.com/xLongLink/longlink"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNavigate}
            >
                GitHub
                <ExternalLink aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <Button
                variant="view"
                data-variant="primary"
                data-size={mobile ? 'md' : 'sm'}
                nativeButton={false}
                render={<RouterLink to="/login/" onClick={onNavigate} />}
            >
                Sign In
            </Button>
        </>
    );
}
