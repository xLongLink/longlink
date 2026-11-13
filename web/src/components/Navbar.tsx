import { cn } from 'cn';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Wordmark } from '@/components/Wordmark';
import { ExternalLink, Menu } from 'lucide-react';
import { Link as RouterLink } from 'react-router';
import { Button, buttonVariants } from '@/components/shadcn/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/shadcn/sheet';

const publicLinks = [
    { href: '/blog/', label: 'Blog' },
    { href: '/docs/', label: 'Documentation' },
    { href: '/pricing/', label: 'Pricing' }
];

/** Renders public navigation at the page's content width. */
export function Navbar({
    maxWidth = 1000,
    navigation,
    expandOnTop = false
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
            className={cn(
                'border-b px-6',
                expandOnTop
                    ? [
                          'sticky top-0 z-30',
                          scrolled
                              ? 'border-border bg-background/50 backdrop-blur-sm'
                              : 'border-transparent bg-transparent'
                      ]
                    : 'border-border bg-background'
            )}
        >
            <div className="mx-auto w-full" style={{ maxWidth: expandOnTop && !scrolled ? '100%' : maxWidth }}>
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <nav className="flex w-full flex-wrap items-center px-2 py-3" aria-label="Main navigation">
                        <RouterLink
                            to="/"
                            aria-label="LongLink home"
                            className="flex min-w-fit flex-1 items-center text-inherit no-underline focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-solid focus-visible:outline-offset-(--focus-outline-offset)"
                        >
                            <Wordmark size="heading" />
                        </RouterLink>
                        <div className="ms-auto flex max-w-full items-center justify-end gap-1">
                            <div className="hidden items-center gap-6 sm:flex">
                                <PublicLinks />
                            </div>
                            <SheetTrigger
                                className="sm:hidden"
                                aria-label="Open navigation"
                                render={<Button variant="ghost" size="icon" type="button" />}
                            >
                                <Menu aria-hidden="true" size={20} />
                            </SheetTrigger>
                        </div>
                    </nav>
                    <SheetContent
                        className="min-h-0"
                        finalFocus={() => !window.matchMedia('(min-width: 640px)').matches}
                    >
                        <SheetHeader className="shrink-0 pr-12">
                            <SheetTitle>Navigation</SheetTitle>
                        </SheetHeader>
                        <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-4">
                            <nav aria-label="Public pages" className="flex flex-col gap-4">
                                <PublicLinks mobile onNavigate={() => setMenuOpen(false)} />
                            </nav>
                        </div>
                    </SheetContent>
                </Sheet>
                {navigation}
            </div>
        </header>
    );
}

/** Keeps public destinations and native link gestures identical in both navigation regions. */
function PublicLinks({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
    // Keep shared link states identical while preserving the desktop's muted emphasis.
    const linkClassName = cn(
        'inline-flex items-center gap-0.5 font-sans text-[length:var(--text-body-size)] leading-(--text-body-leading) no-underline hover:underline focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-solid focus-visible:outline-offset-(--focus-outline-offset) [&>svg]:size-3 [&>svg]:shrink-0',
        mobile ? 'text-inherit' : 'font-medium text-muted-foreground'
    );

    return (
        <>
            {publicLinks.map((link) => (
                <RouterLink key={link.href} className={linkClassName} to={link.href} onClick={onNavigate}>
                    {link.label}
                </RouterLink>
            ))}
            <a
                className={linkClassName}
                href="https://github.com/xLongLink/longlink"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNavigate}
            >
                GitHub
                <ExternalLink aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <RouterLink
                className={buttonVariants({ size: mobile ? 'default' : 'sm' })}
                to="/login/"
                onClick={onNavigate}
            >
                Sign In
            </RouterLink>
        </>
    );
}
