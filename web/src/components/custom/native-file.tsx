import { PdfFile } from './pdf-file';
import { textLanguage } from '@/lib/files';
import { useEffect, useRef, useState } from 'react';

/** Displays admitted media and inert document content without nested frames. */
export function NativeFile({ body, title }: { body: Blob; title: string }) {
    const container = useRef<HTMLDivElement>(null);
    const media = body.type.split(';', 1)[0].toLowerCase();
    const image = /^image\/(?:png|jpeg|gif|webp)$/.test(media);
    const audio = /^audio\/(?:mpeg|ogg)$/.test(media);
    const video = media === 'video/mp4';
    const pdf = media === 'application/pdf';
    const text = textLanguage('', media) !== undefined;
    const supported = image || audio || video || pdf || text;

    // Never grant HTML, SVG, or unknown binary bytes a host-origin document.
    useEffect(() => {
        if (!image && !audio && !video) return;

        const element = container.current?.querySelector<HTMLImageElement | HTMLMediaElement>('img, audio, video');

        if (!element) return;
        const source = URL.createObjectURL(body);
        element.src = source;

        return () => {
            element.removeAttribute('src');
            URL.revokeObjectURL(source);
        };
    }, [body, image, audio, video]);

    // Use browser controls rather than a custom attachment toolbar.
    if (!supported) return <span role="status">Preview unavailable for this file type.</span>;

    // PDF parsing and text rendering remain in the same document as the caller.
    return (
        <div ref={container} className="flex size-full items-center justify-center">
            {image ? (
                <img alt={title} className="size-full object-contain" />
            ) : audio ? (
                <audio controls preload="metadata" aria-label={title} className="w-full" />
            ) : video ? (
                <video controls preload="metadata" aria-label={title} className="size-full" />
            ) : pdf ? (
                <PdfFile body={body} title={title} />
            ) : (
                <TextFile body={body} />
            )}
        </div>
    );
}

/** Treats source documents as text rather than navigable or executable markup. */
function TextFile({ body }: { body: Blob }) {
    const [text, setText] = useState<string | Error>();

    // Ignore decoded content after replacing or closing the document.
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const text = await body.text();
                if (!cancelled) setText(text);
            } catch {
                if (!cancelled) setText(new Error('Unable to display this file.'));
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [body]);

    return text instanceof Error ? (
        <span role="status">{text.message}</span>
    ) : (
        <pre className="size-full overflow-auto p-3 text-sm whitespace-pre-wrap wrap-anywhere">{text}</pre>
    );
}
