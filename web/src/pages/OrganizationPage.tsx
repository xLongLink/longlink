import { useMemo } from 'react';
import { useApiData } from '@/hooks/use-data';
import { fromXml, renderNode, createContext, registry } from '@/xml';
import { getPageContentFromResponse } from '@/sdk/pages';
import type { AppNavigationPage } from '@/lib/navigation';

type OrganizationPageProps = {
    page: string;
};

export default function OrganizationPage({ page }: OrganizationPageProps) {
    const { data: metadata, isLoading, error } = useApiData<{ pages?: AppNavigationPage[] }>('/metadata.json');
    const pageContent = useMemo(() => getPageContentFromResponse(metadata, page), [metadata, page]);

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!pageContent) {
        return <div>Unexpected response format for /metadata.json</div>;
    }

    const ast = fromXml(pageContent);
    const ctx = createContext({ baseUrl: '/api' });
    return <>{renderNode(ast, registry, ctx)}</>;
}
