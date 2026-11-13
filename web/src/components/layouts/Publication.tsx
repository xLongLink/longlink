import { Menu, X } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Dialog } from '@base-ui/react/dialog';
import { Outlet, useLocation } from 'react-router';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useId, useRef, useState, type ReactNode } from 'react';

/** Shares public publication chrome while leaving sidebar content with its caller. */
export default function Publication({
    navigation,
    sideNav,
    className = 'min-h-0!'
}: {
    navigation?: ReactNode;
    sideNav: ReactNode;
    className?: string;
}) {
    const isMobile = useMediaQuery('(width < 1024px)');
    const [openedLocationKey, setOpenedLocationKey] = useState<string | null>(null);
    const location = useLocation();
    const mainId = useId();
    const mainRef = useRef<HTMLElement>(null);
    const hasSideNav = sideNav != null && sideNav !== false && sideNav !== true && sideNav !== '';

    // A mobile navigation session ends when the route or layout changes.
    if (openedLocationKey !== null && (!isMobile || openedLocationKey !== location.key)) {
        setOpenedLocationKey(null);
    }

    return (
        <section className="publication">
            <Navbar maxWidth={1272} navigation={navigation} />
            <section className={`publication-shell ${className}`}>
                <a className="publication-skip-link" href={`#${mainId}`} onClick={() => mainRef.current?.focus()}>
                    Skip to content
                </a>
                {isMobile && hasSideNav && (
                    <Dialog.Root
                        open={openedLocationKey === location.key}
                        onOpenChange={(open) => setOpenedLocationKey(open ? location.key : null)}
                    >
                        <header className="publication-mobile-bar">
                            <Dialog.Trigger
                                aria-label="Open section navigation"
                                className="publication-nav-toggle"
                                type="button"
                            >
                                <Menu aria-hidden="true" size={20} />
                            </Dialog.Trigger>
                        </header>
                        <Dialog.Portal keepMounted>
                            <Dialog.Backdrop className="publication-nav-backdrop" />
                            <Dialog.Popup className="publication-nav-dialog" aria-label="Section navigation">
                                <header className="publication-nav-header">
                                    <Dialog.Title>Section navigation</Dialog.Title>
                                    <Dialog.Close
                                        aria-label="Close section navigation"
                                        className="publication-nav-toggle"
                                        type="button"
                                    >
                                        <X aria-hidden="true" size={20} />
                                    </Dialog.Close>
                                </header>
                                <section className="publication-nav-content">{sideNav}</section>
                            </Dialog.Popup>
                        </Dialog.Portal>
                    </Dialog.Root>
                )}
                <section className="publication-body">
                    {!isMobile && hasSideNav && (
                        <aside className="publication-sidebar">
                            <section className="publication-sidebar-content">{sideNav}</section>
                        </aside>
                    )}
                    <main className="publication-main" id={mainId} ref={mainRef} tabIndex={-1}>
                        <Outlet />
                    </main>
                </section>
            </section>
            <Footer maxWidth={1272} />
        </section>
    );
}
