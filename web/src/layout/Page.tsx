import type { ReactNode } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

/** Renders public page chrome around page-specific content. */
export function Page({ children }: { children: ReactNode }) {
    return (
        <Stack minHeight="100vh" gap={0}>
            <DevelopmentNotice />
            <Navbar />
            {children}
            <Footer />
        </Stack>
    );
}
