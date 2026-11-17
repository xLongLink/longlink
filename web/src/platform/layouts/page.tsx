import { Footer } from '@/components/ui/footer';
import { Navbar } from '@/components/ui/navbar';
import { Outlet, useLocation } from 'react-router';
import { Stack } from '@/components/longlink/layout/stack';

/** Renders public page chrome around page-specific content. */
export default function Page() {
    const { pathname } = useLocation();
    const isHome = pathname === '/';

    return (
        <Stack gap={0} className={`min-h-screen${isHome ? ' bg-black text-white' : ''}`}>
            <Navbar expandOnTop={isHome} />
            <div className="min-h-0 min-w-0 grow">
                <Outlet />
            </div>
            <Footer />
        </Stack>
    );
}
