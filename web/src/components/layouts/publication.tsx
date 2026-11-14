import { Footer } from '@/components/ui/footer';
import { Navbar } from '@/components/ui/navbar';
import { Outlet, useLocation } from 'react-router';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useId, useRef, useState, type ReactNode } from 'react';
import { PublicationNavigation } from '@/components/dialogs/publication-navigation';

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
                    <PublicationNavigation
                        open={openedLocationKey === location.key}
                        onOpenChange={(open) => setOpenedLocationKey(open ? location.key : null)}
                    >
                        {sideNav}
                    </PublicationNavigation>
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
