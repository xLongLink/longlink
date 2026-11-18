import { Spinner } from '@/components/shadcn/spinner';
import { useContext, useEffect, useState } from 'react';
import { NativeFile } from '@/components/custom/native-file';
import { FileRequestContext } from '@/components/custom/preview';

/** Displays supported attachments inside the View using scoped file requests. */
export function FileViewer({
    src,
    title
}: {
    /** Scoped Solution operation path returning the file to preview. */
    src: string;
    /** Accessible name for the embedded file. */
    title: string;
}) {
    // Give replacement files independent requests and object-URL lifetimes.
    return <FileContent key={src} src={src} title={title} />;
}

/** Owns the request and rendering lifetime of one inline attachment. */
function FileContent({ src, title }: { src: string; title: string }) {
    const request = useContext(FileRequestContext)?.load;
    const [preview, setPreview] = useState<Blob | Error>();

    // Ignore replaced requests without moving file rendering outside the View.
    useEffect(() => {
        let active = true;

        /** Ignore responses from replaced or unmounted file requests. */
        async function load() {
            try {
                if (!request) throw new Error('File preview unavailable');
                const body = await request(src);

                if (active) setPreview(body);
            } catch (cause) {
                if (active) setPreview(cause instanceof Error ? cause : new Error('File preview failed'));
            }
        }

        void load();

        return () => {
            active = false;
        };
    }, [request, src]);

    // Keep one bounded viewer region with no custom View or Download buttons.
    return (
        <div className="flex h-96 w-full min-w-0 items-center justify-center" aria-label={title}>
            {preview instanceof Blob ? (
                <NativeFile body={preview} title={title} />
            ) : preview instanceof Error ? (
                <span role="status">{preview.message}</span>
            ) : (
                <Spinner role="progressbar" aria-label={`Loading ${title}`} />
            )}
        </div>
    );
}
