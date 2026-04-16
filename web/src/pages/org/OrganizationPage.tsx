import { fromXml, renderNode, createContext, registry } from '@/xml';
import { useApiData } from '@/hooks/use-data';

type OrganizationPageProps = {
    page: string;
};

export default function OrganizationPage({ page }: OrganizationPageProps) {
    const endpoint = `/pages/${page}`;
    const { data, isLoading, error } = useApiData<string>(endpoint);

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!data) {
        return <div>Unexpected response format for {endpoint}</div>;
    }

    const ast = fromXml(data);
    const ctx = createContext({ baseUrl: '/api' });
    return <>{renderNode(ast, registry, ctx)}</>;
}
