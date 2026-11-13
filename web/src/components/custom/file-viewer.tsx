import { NativeFile } from './native-file';
import { FileRequestContext } from './preview';
import { FileViewerContext } from './file-context';
import { Spinner } from '@/components/shadcn/spinner';
import { useContext, useEffect, useRef, useState } from 'react';

/** Displays supported attachments immediately using native browser media controls. */
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
    return <FileContent key={`${src}\0${title}`} src={src} title={title} />;
}

/** Reserves a host-owned document slot or loads a trusted native-page example. */
function FileContent({ src, title }: { src: string; title: string }) {
    const element = useRef<HTMLDivElement>(null);
    const mount = useContext(FileViewerContext);
    const request = useContext(FileRequestContext)?.preview;
    const [preview, setPreview] = useState<Blob | Error>();

    // The host renders native plugins without weakening the Solution sandbox.
    useEffect(() => {
        if (mount && element.current) return mount(element.current, src, title);
        const controller = new AbortController();

        /** Ignore responses from replaced or unmounted file requests. */
        async function load() {
            try {
                const body = await request?.(src);

                if (!(body instanceof Blob)) throw new Error('File preview unavailable');

                if (!controller.signal.aborted) setPreview(body);
            } catch (cause) {
                if (!controller.signal.aborted)
                    setPreview(cause instanceof Error ? cause : new Error('File preview failed'));
            }
        }

        void load();

        return () => controller.abort();
    }, [mount, request, src, title]);

    // Keep one bounded viewer region with no custom View or Download buttons.
    return (
        <div ref={element} className="flex h-96 w-full min-w-0 items-center justify-center" aria-label={title}>
            {!mount &&
                (preview instanceof Blob ? (
                    <NativeFile body={preview} title={title} />
                ) : preview instanceof Error ? (
                    <span role="status">{preview.message}</span>
                ) : (
                    <Spinner role="progressbar" aria-label={`Loading ${title}`} />
                ))}
        </div>
    );
}
