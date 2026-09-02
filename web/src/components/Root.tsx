import { Outlet } from 'react-router';
import { RootProvider } from '@/providers';
import '@/index.css';

export { Document } from '@/components/layouts/Document';

/** Provides isolated runtime state around the active framework route. */
export function Root() {
    return (
        <RootProvider>
            <Outlet />
        </RootProvider>
    );
}
