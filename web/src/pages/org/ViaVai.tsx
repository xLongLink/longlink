import Render, { type RenderNodeSchema } from '@/components/Render';
import { useData } from '@/hooks/use-data';

export default function ViaVai() {
    const { data, isLoading, error } = useData<unknown>('/sample/page');

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
        return <div>Unexpected response format for /sample/page</div>;
    }

    return (
        <>
            {samplePageData.map((node, index) => (
                <Render key={index} {...node} />
            ))}
        </>
    );
}
