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
        <section className="flex min-h-dvh flex-col">
            <Navbar maxWidth={1272} navigation={navigation} />
            <section
                className={`relative mx-auto flex min-h-dvh w-full max-w-[1320px] flex-1 flex-col overflow-clip bg-background ${className}`}
            >
                <a
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[9999] focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:whitespace-nowrap focus:text-primary focus:no-underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid focus-visible:outline-offset-2"
                    href={`#${mainId}`}
                    onClick={() => mainRef.current?.focus()}
                >
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
                <section className="flex min-h-0 min-w-0 flex-1">
                    {!isMobile && hasSideNav && (
                        <aside className="publication-sidebar sticky top-0 flex h-dvh flex-none flex-col overflow-clip bg-inherit">
                            <section className="flex-1 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {sideNav}
                            </section>
                        </aside>
                    )}
                    <main
                        className="min-h-0 min-w-0 flex-1 overflow-clip bg-card pb-[env(safe-area-inset-bottom,0px)] text-card-foreground outline-none"
                        id={mainId}
                        ref={mainRef}
                        tabIndex={-1}
                    >
                        <Outlet />
                    </main>
                </section>
            </section>
            <Footer maxWidth={1272} />
        </section>
    );
}
