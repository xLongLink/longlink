import { useEffect, useState, type ReactNode } from 'react';

import DocsLayout from '@/layout/DocsLayout';
import type { DocPage } from '@/pages/docs/catalog';

type DocsPageRouteProps = {
    page: DocPage;
};

/** Loads one docs page lazily and renders it inside the shared docs shell. */
export default function DocsPageRoute({ page }: DocsPageRouteProps) {
    const [content, setContent] = useState<ReactNode | null>(null);
    const [metadata, setMetadata] = useState<{ lastUpdated?: string; editUrl?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        // Reset the page state before loading the next docs module.
        setContent(null);
        setMetadata(null);
        setError(null);

        void page
            .loadContent()
            .then((result) => {
                if (!active) {
                    return;
                }

                setContent(result.content);
                setMetadata(result.metadata);
            })
            .catch((loadError: unknown) => {
                if (!active) {
                    return;
                }

                setError(loadError instanceof Error ? loadError.message : 'Failed to load docs page');
            });

        return () => {
            active = false;
        };
    }, [page]);

    if (error) {
        return <div className="px-6 py-10 text-sm text-destructive">{error}</div>;
    }

    if (!content || !metadata) {
        return <div className="px-6 py-10 text-sm text-muted-foreground">Loading docs...</div>;
    }

    return <DocsLayout content={content} metadata={metadata} />;
}
