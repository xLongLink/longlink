import Render from '@/components/Render';
import { useApiData } from '@/hooks/use-data';
import { resolveXmlPayload } from '@/lib/xml';

type OrganizationPageProps = {
    page: 'overview' | 'tools' | 'spaces' | 'processes' | 'people' | 'settings';
};

export default function OrganizationPage({ page }: OrganizationPageProps) {
    const endpoint = `/pages/${page}`;
    const { data, isLoading, error } = useApiData<string | { xml?: string | null; content?: string | null }>(endpoint);
    const xml = resolveXmlPayload(data);

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!xml) {
        return <div>Unexpected response format for {endpoint}</div>;
    }

    return <Render xml={xml} />;
}
