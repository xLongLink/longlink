import Render, { type RenderNodeSchema } from '@/components/Render';
import { useData } from '@/hooks/use-data';
import { useParams } from 'react-router';

export default function ViaVai() {
    const { app } = useParams();
    const pageEndpoint = app ? `/apps/${app}/page` : null;
    const { data, isLoading, error } = useData<unknown>(pageEndpoint);

    const samplePageData = Array.isArray(data)
        ? (data as RenderNodeSchema[])
        : [];

    if (error) {
        return <div>{error}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (data !== null && !Array.isArray(data)) {
        return <div>Unexpected response format for {pageEndpoint}</div>;
    }

    return (
        <>
            {samplePageData.map((node, index) => (
                <Render key={index} {...node} />
            ))}
        </>
    );
}
