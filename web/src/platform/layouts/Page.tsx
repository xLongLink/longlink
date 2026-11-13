import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Outlet, useLocation } from 'react-router';
import { NativeStack as Stack } from '@/components/custom/NativeStack';

/** Renders public page chrome around page-specific content. */
export default function Page() {
    const { pathname } = useLocation();
    const isHome = pathname === '/';

    return (
        <Stack className={isHome ? 'bg-black text-white' : undefined} minHeight="100vh">
            <Navbar expandOnTop={isHome} />
            <div className="min-h-0 min-w-0 grow">
                <Outlet />
            </div>
            <Footer />
        </Stack>
    );
}
