import { Outlet } from 'react-router';
import { RootProvider } from '@/providers';
import '@/index.css';

export { Document as Layout } from '@/components/layouts/Document';

/** Provides isolated Platform runtime state around the active framework route. */
export default function PlatformRoot() {
    return (
        <RootProvider>
            <Outlet />
        </RootProvider>
    );
}
