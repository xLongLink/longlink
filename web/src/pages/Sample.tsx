import { RenderXML, fromXml } from '@/xml';
import { useQuery } from '@tanstack/react-query';

/** Renders the live XML sample page for web-only component testing. */
export default function Sample() {
    /* Fetch the standalone XML asset that powers the live component playground. */
    const { data, isLoading, error } = useQuery({
        queryKey: ['sample-xml'],
        queryFn: async () => {
            const response = await fetch('/sample.xml', {
                headers: { Accept: 'application/xml' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`Sample request failed (${response.status})`);
            }

            return response.text();
        },
    });

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isLoading || !data) {
        return <div>Loading...</div>;
    }

    const ast = fromXml(data);

    return (
        <div className="min-h-screen text-white">
            <main className="mx-auto w-full max-w-6xl px-6 py-10">
                <RenderXML ast={ast} baseUrl="" />
            </main>
        </div>
    );
}
