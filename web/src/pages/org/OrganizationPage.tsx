import Render from '@/components/Render';
import { useApiData } from '@/hooks/use-data';

type OrganizationPageProps = {
    page: 'overview' | 'tools' | 'spaces' | 'processes' | 'people' | 'settings';
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

    return <Render xml={data} />;
}
