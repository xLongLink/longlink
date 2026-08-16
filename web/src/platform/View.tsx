import type { ReactNode } from 'react';
import NotFound from '@/platform/NotFound';
import { RuntimeApplicationView } from '@/xml/ApplicationView';

type ViewProps = {
    basePath: string;
    errorAction?: ReactNode;
    pages: string;
};

/** Renders XML pages registered by a Platform application manifest. */
export default function PlatformApplicationView({ basePath, errorAction, pages }: ViewProps) {
    return <RuntimeApplicationView basePath={basePath} errorAction={errorAction} notFound={NotFound} pages={pages} />;
}
