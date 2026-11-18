import { PdfFile } from './pdf-file';
import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/shadcn/spinner';
import { previewKind, textLanguage } from '@/lib/files';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Displays admitted media and inert document content without nested frames. */
export function NativeFile({ body, title, highlight = false }: { body: Blob; title: string; highlight?: boolean }) {
    const container = useRef<HTMLDivElement>(null);
    const media = body.type.split(';', 1)[0].toLowerCase();
    const kind =
        highlight && media !== 'application/pdf' && textLanguage(title, media) !== undefined
            ? 'text'
            : previewKind(media);

    // Never grant HTML, SVG, or unknown binary bytes a host-origin document.
    useEffect(() => {
        if (kind !== 'image' && kind !== 'audio' && kind !== 'video') return;

        const element = container.current?.querySelector<HTMLImageElement | HTMLMediaElement>('img, audio, video');

        if (!element) return;
        const source = URL.createObjectURL(body);
        element.src = source;

        return () => {
            element.removeAttribute('src');
            URL.revokeObjectURL(source);
        };
    }, [body, kind]);

    // Use browser controls rather than a custom attachment toolbar.
    if (kind === undefined) return <span role="status">Preview unavailable for this file type.</span>;
    if (kind === 'text') return <TextFile body={body} title={title} highlight={highlight} />;

    // PDF parsing and text rendering remain in the same document as the caller.
    return (
        <div ref={container} className="flex size-full items-center justify-center">
            {kind === 'image' ? (
                <img alt={title} className="size-full object-contain" />
            ) : kind === 'audio' ? (
                <audio controls preload="metadata" aria-label={title} className="w-full" />
            ) : kind === 'video' ? (
                <video controls preload="metadata" aria-label={title} className="size-full" />
            ) : (
                <PdfFile body={body} title={title} />
            )}
        </div>
    );
}

/** Treats source documents as text rather than navigable or executable markup. */
function TextFile({ body, title, highlight }: { body: Blob; title: string; highlight: boolean }) {
    const [result, setResult] = useState<{ body: Blob; text: string | Error }>();
    const text = result?.body === body ? result.text : undefined;

    // Ignore decoded content after replacing or closing the document.
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const bytes = await body.arrayBuffer();
                const text = new TextDecoder('utf-8', { fatal: highlight }).decode(bytes);
                if (!cancelled) setResult({ body, text });
            } catch {
                if (!cancelled) setResult({ body, text: new Error('Unable to display this file.') });
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [body, highlight]);

    if (text instanceof Error) return <span role="status">{text.message}</span>;
    if (text === undefined) return <Spinner role="progressbar" aria-label={`Loading ${title}`} />;

    return highlight ? (
        <CodeBlock code={text} language={textLanguage(title) ?? 'plaintext'} showLineNumbers wrap variant="ghost">
            <CodeBlockCopyButton />
        </CodeBlock>
    ) : (
        <pre className="size-full overflow-auto p-3 text-sm whitespace-pre-wrap wrap-anywhere">{text}</pre>
    );
}
