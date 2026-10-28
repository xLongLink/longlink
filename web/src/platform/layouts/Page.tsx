import { useEffect, useRef } from 'react';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Outlet, useLocation } from 'react-router';
import { Stack, StackItem } from '@astryxdesign/core/Stack';

/** Renders public page chrome around page-specific content. */
export default function Page() {
    const { pathname } = useLocation();
    const isHome = pathname === '/';
    const pageRef = useRef<HTMLDivElement>(null);

    // Keep the opening section within the viewport as navigation dimensions change.
    useEffect(() => {
        const page = pageRef.current;
        const navigation = page?.querySelector('header');

        if (!page || !navigation) return;

        const updateHeight = () => {
            page.style.setProperty('--public-navigation-height', `${navigation.getBoundingClientRect().height}px`);
        };

        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(navigation);

        return () => observer.disconnect();
    }, []);

    return (
        <Stack ref={pageRef} className={isHome ? 'bg-black text-white' : undefined} minHeight="100vh">
            <Navbar expandOnTop={isHome} />
            <StackItem size="fill">
                <Outlet />
            </StackItem>
            <Footer />
        </Stack>
    );
}
