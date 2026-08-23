import { Outlet } from 'react-router';
import { RootProvider } from '@/providers';
import '@/index.css';

export { Document as Layout } from '@/components/layouts/Document';

export const meta = () => [{ title: 'LongLink' }];

/** Provides isolated runtime state around the embedded Application route. */
export default function ApplicationRoot() {
    return (
        <RootProvider>
            <Outlet />
        </RootProvider>
    );
}
