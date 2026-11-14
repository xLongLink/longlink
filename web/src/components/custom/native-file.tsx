import { useEffect, useRef } from 'react';
import { textLanguage } from '@/lib/files';

/** Renders only inert media; active text formats are retyped before native display. */
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
        if (!supported) return;

        const element = container.current?.querySelector<HTMLImageElement | HTMLMediaElement | HTMLIFrameElement>(
            'img, audio, video, iframe'
        );

        if (!element) return;
        const source = URL.createObjectURL(text ? new Blob([body], { type: 'text/plain;charset=utf-8' }) : body);
        element.src = source;

        return () => {
            element.removeAttribute('src');
            URL.revokeObjectURL(source);
        };
    }, [body, supported, text]);

    // Use browser controls rather than a custom attachment toolbar.
    if (!supported) return <span role="status">Preview unavailable for this file type.</span>;

    // Native PDF plugins must run outside the opaque-origin Solution sandbox.
    return (
        <div ref={container} className="flex size-full items-center justify-center">
            {image ? (
                <img alt={title} className="size-full object-contain" />
            ) : audio ? (
                <audio controls preload="metadata" aria-label={title} className="w-full" />
            ) : video ? (
                <video controls preload="metadata" aria-label={title} className="size-full" />
            ) : text ? (
                <iframe title={title} sandbox="" className="size-full border-0 bg-white" />
            ) : (
                <iframe title={title} className="size-full border-0" />
            )}
        </div>
    );
}
