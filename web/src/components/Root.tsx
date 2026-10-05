import { Outlet } from 'react-router';
import { RootProvider } from '@/providers';
import { ApiBoundary } from '@/components/ApiBoundary';
import '@/index.css';

export { Document } from '@/components/layouts/Document';

/** Provides isolated runtime state around the active framework route. */
export function Root() {
    return (
        <RootProvider>
            <ApiBoundary>
                <Outlet />
            </ApiBoundary>
        </RootProvider>
    );
}
