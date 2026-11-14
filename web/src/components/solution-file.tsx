import * as host from '@/views/host';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/shadcn/spinner';
import { NativeFile } from '@/components/custom/native-file';

/** Loads an inline document through the same scoped host boundary as Solution requests. */
export function SolutionFile({ base, path, title }: { base: string; path: string; title: string }) {
    const [preview, setPreview] = useState<Blob | Error>();

    // Cancelling the slot also cancels its authenticated request.
    useEffect(() => {
        const controller = new AbortController();

        /** Load supported bytes without exposing credentials or request URLs to the View. */
        async function load() {
            try {
                const body = await host.load(host.requestUrl(base, path), {
                    cache: 'no-cache',
                    signal: controller.signal
                });

                if (!controller.signal.aborted) setPreview(body);
            } catch {
                if (!controller.signal.aborted) setPreview(new Error('File preview failed'));
            }
        }

        void load();

        return () => controller.abort();
    }, [base, path]);

    // NativeFile admits media types before creating any host-origin document.
    return preview instanceof Blob ? (
        <NativeFile body={preview} title={title} />
    ) : preview instanceof Error ? (
        <span role="status">{preview.message}</span>
    ) : (
        <Spinner role="progressbar" aria-label={`Loading ${title}`} />
    );
}
