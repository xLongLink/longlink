import { useEffect, useState } from 'react';

import { ViaVaiLayout } from '@/components/viavai/Layout';
import { apiFetch } from '@/lib/api';

export default function ViaVai() {
    const [samplePageData, setSamplePageData] = useState<unknown[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadSamplePage = async () => {
            try {
                const data = await apiFetch<unknown>('/sample/page');
                if (!isMounted) return;

                if (Array.isArray(data)) {
                    setSamplePageData(data);
                } else {
                    setSamplePageData([]);
                    setError('Unexpected response format for /sample/page');
                }
            } catch (requestError) {
                if (!isMounted) return;
                setError('Failed to load /sample/page');
                console.error(requestError);
            }
        };

        loadSamplePage();

        return () => {
            isMounted = false;
        };
    }, []);

    if (error) {
        return <div>{error}</div>;
    }

    return <ViaVaiLayout elements={samplePageData} />;
}
