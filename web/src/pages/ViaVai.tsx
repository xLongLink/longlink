import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';

export default function ViaVai() {
    const [samplePageData, setSamplePageData] = useState<unknown>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadSamplePage = async () => {
            try {
                const data = await apiFetch<unknown>('/sample/page');
                if (!isMounted) return;
                setSamplePageData(data);
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

    return <div>{error ? error : JSON.stringify(samplePageData)}</div>;
}
