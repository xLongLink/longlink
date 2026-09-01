import { Outlet } from 'react-router';
import { RootProvider } from '@/providers';
import '@/index.css';

export { Document as Layout } from '@/components/layouts/Document';

export const meta = () => [{ title: 'LongLink' }];

/** Provides isolated Application runtime state around the active framework route. */
export default function ApplicationRoot() {
    return (
        <RootProvider>
            <Outlet />
        </RootProvider>
    );
}
