import type { ReactNode } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

/** Renders public page chrome around page-specific content. */
export function PublicPage({
    children,
    className,
    footer,
}: {
    children: ReactNode;
    className?: string;
    footer?: ReactNode;
}) {
    return (
        <Stack className={className} minHeight="100vh" gap={0}>
            <Navbar />
            {children}
            {footer ?? <Footer />}
        </Stack>
    );
}
