import { Outlet } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

/** Renders public page chrome around page-specific content. */
export default function Page() {
    return (
        <Stack minHeight="100vh">
            <DevelopmentNotice />
            <Navbar />
            <Outlet />
            <Footer />
        </Stack>
    );
}
