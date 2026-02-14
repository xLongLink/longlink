import { useEffect, useState } from 'react';

import { Hero } from '@/components/viavai/Hero';
import { apiFetch } from '@/lib/api';

type HeroElement = {
    type: string;
    title: string;
    subtitle?: string | null;
};

function isHeroElement(element: unknown): element is HeroElement {
    if (!element || typeof element !== 'object') {
        return false;
    }

    const candidate = element as Record<string, unknown>;
    return (
        typeof candidate.type === 'string' &&
        candidate.type.toLowerCase() === 'hero' &&
        typeof candidate.title === 'string'
    );
}

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

    return (
        <div className="space-y-4">
            {samplePageData.map((element, index) => {
                if (isHeroElement(element)) {
                    return (
                        <Hero
                            key={`hero-${index}`}
                            title={element.title}
                            subtitle={element.subtitle ?? undefined}
                        />
                    );
                }

                return null;
            })}
        </div>
    );
}
