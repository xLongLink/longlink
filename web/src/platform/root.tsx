import { Outlet } from 'react-router';
import { RootProvider } from '@/providers';
import '@/index.css';
import { SearchMetadata } from '@/components/layouts/SearchMetadata';

export { Document as Layout } from '@/components/layouts/Document';

const isApplication = import.meta.env.MODE === 'sdk';

/** Provides isolated Platform runtime state around the active framework route. */
export default function PlatformRoot() {
    return (
        <RootProvider>
            {isApplication ? null : <SearchMetadata />}
            <Outlet />
        </RootProvider>
    );
}
