import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TopNav } from '@astryxdesign/core/TopNav';
import { MobileNav } from '@astryxdesign/core/MobileNav';

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
        <Stack
            as="header"
            className={
                expandOnTop
                    ? `sticky top-0 z-30 border-b ${scrolled ? 'border-border bg-body/50 backdrop-blur-sm' : 'border-transparent bg-transparent'}`
                    : 'border-b border-border bg-body'
            }
            paddingInline={6}
        >
            <Stack
                className="mx-auto transition-[max-width] duration-300 ease-out motion-reduce:transition-none"
                maxWidth={expandOnTop && !scrolled ? '100%' : maxWidth}
                width="100%"
            >
                <TopNav
                    className="py-3"
                    heading={
                        <Link href="/" label="LongLink home" color="inherit">
                            <Wordmark size="heading" />
                        </Link>
                    }
                    label="Main navigation"
                    endContent={
                        <>
                            <Stack className="hidden sm:flex" direction="horizontal" gap={6} vAlign="center">
                                <Link href="/blog/" color="secondary" isStandalone weight="medium">
                                    Blog
                                </Link>
                                <Link href="/docs/" color="secondary" isStandalone weight="medium">
                                    Documentation
                                </Link>
                                <Link href="/pricing/" color="secondary" isStandalone weight="medium">
                                    Pricing
                                </Link>
                                <Link
                                    as="a"
                                    color="secondary"
                                    href="https://github.com/xLongLink/longlink"
                                    isExternalLink
                                    isStandalone
                                    weight="medium"
                                >
                                    GitHub
                                </Link>
                                <Button href="/login/" label="Sign In" size="sm" variant="primary" />
                            </Stack>
                            <Button
                                className="sm:hidden"
                                icon={<Menu aria-hidden="true" size={20} />}
                                isIconOnly
                                label="Open navigation"
                                variant="ghost"
                                aria-haspopup="dialog"
                                aria-expanded={menuOpen}
                                onClick={() => setMenuOpen(true)}
                            />
                        </>
                    }
                />
                {navigation}
            </Stack>
            <MobileNav isOpen={menuOpen} onOpenChange={setMenuOpen} header="Navigation" label="Main navigation">
                <Stack as="nav" aria-label="Public pages" gap={4} padding={4}>
                    <Link href="/blog/" color="inherit" isStandalone onClick={() => setMenuOpen(false)}>
                        Blog
                    </Link>
                    <Link href="/docs/" color="inherit" isStandalone onClick={() => setMenuOpen(false)}>
                        Documentation
                    </Link>
                    <Link href="/pricing/" color="inherit" isStandalone onClick={() => setMenuOpen(false)}>
                        Pricing
                    </Link>
                    <Link
                        as="a"
                        href="https://github.com/xLongLink/longlink"
                        color="inherit"
                        isExternalLink
                        isStandalone
                        onClick={() => setMenuOpen(false)}
                    >
                        GitHub
                    </Link>
                    <Button href="/login/" label="Sign In" variant="primary" onClick={() => setMenuOpen(false)} />
                </Stack>
            </MobileNav>
        </Stack>
    );
}
