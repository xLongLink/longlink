import { previewKind } from '@/lib/files';
import { Button } from '@/components/shadcn/button';
import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/shadcn/spinner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';

/** Displays admitted media and inert document content without nested frames. */
export function FilePreview({ body, title, fit = 'width' }: { body: Blob; title: string; fit?: 'width' | 'page' }) {
    const container = useRef<HTMLDivElement>(null);
    const [content, setContent] = useState({ body, key: 0 });
    const media = body.type.split(';', 1)[0].toLowerCase();
    const kind = previewKind(media);

    // Reset decoders for new bytes without replacing media elements.
    if (content.body !== body) setContent({ body, key: content.key + 1 });

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
    if (kind === 'text') return <TextFile key={content.key} body={body} title={title} />;

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
                <PdfFile key={content.key} body={body} title={title} fit={fit} />
            )}
        </div>
    );
}

/** Treats source documents as text rather than navigable or executable markup. */
function TextFile({ body, title }: { body: Blob; title: string }) {
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

    if (text instanceof Error) return <span role="status">{text.message}</span>;
    if (text === undefined) return <Spinner role="progressbar" aria-label={`Loading ${title}`} />;

    return <pre className="size-full overflow-auto p-3 text-sm whitespace-pre-wrap wrap-anywhere">{text}</pre>;
}

function PdfFile({ body, title, fit }: { body: Blob; title: string; fit: 'width' | 'page' }) {
    const [document, setDocument] = useState<PDFDocumentProxy | Error>();

    useEffect(() => {
        let cancelled = false;
        let task: PDFDocumentLoadingTask | undefined;
        let port: Worker | undefined;
        let worker: import('pdfjs-dist').PDFWorker | undefined;

        function dispose() {
            cancelled = true;
            void task?.destroy();
            worker?.destroy();
            port?.terminate();
        }

        async function load() {
            try {
                const [pdf, { default: source }, bytes] = await Promise.all([
                    import('pdfjs-dist'),
                    import('pdfjs-dist/build/pdf.worker.min.mjs?raw'),
                    body.arrayBuffer()
                ]);
                if (cancelled) return;

                port = new Worker(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, {
                    type: 'module'
                });
                port.addEventListener('error', () => {
                    if (cancelled) return;
                    setDocument(new Error('Unable to display this PDF.'));
                    dispose();
                });
                worker = pdf.PDFWorker.create({ port });
                task = pdf.getDocument({
                    data: new Uint8Array(bytes),
                    worker,
                    useSystemFonts: true,
                    useWasm: false,
                    useWorkerFetch: false,
                    disableWorkerRendering: true
                });
                const loaded = await task.promise;
                if (!cancelled) setDocument(loaded);
            } catch {
                if (!cancelled) {
                    setDocument(new Error('Unable to display this PDF.'));
                    dispose();
                }
            }
        }

        void load();
        return dispose;
    }, [body]);

    if (document instanceof Error) return <span role="status">{document.message}</span>;
    if (!document) return <Spinner role="progressbar" aria-label={`Loading ${title}`} />;

    return <PdfDocument document={document} title={title} fit={fit} />;
}

function PdfDocument({ document, title, fit }: { document: PDFDocumentProxy; title: string; fit: 'width' | 'page' }) {
    const [page, setPage] = useState(1);

    return (
        <div className="flex size-full min-w-0 flex-col">
            {document.numPages > 1 && (
                <div className="flex shrink-0 items-center justify-center gap-2 border-b p-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Previous page"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                    >
                        <ChevronLeft />
                    </Button>
                    <span className="text-xs tabular-nums" aria-live="polite">
                        {page} / {document.numPages}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Next page"
                        disabled={page === document.numPages}
                        onClick={() => setPage(page + 1)}
                    >
                        <ChevronRight />
                    </Button>
                </div>
            )}
            <PdfPage key={page} document={document} page={page} title={title} fit={fit} />
        </div>
    );
}

function PdfPage({
    document,
    page,
    title,
    fit
}: {
    document: PDFDocumentProxy;
    page: number;
    title: string;
    fit: 'width' | 'page';
}) {
    const container = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const { width, height } = size;
    const [text, setText] = useState('');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const element = container.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => {
            const width = Math.floor(entry.contentRect.width);
            const height = Math.floor(entry.contentRect.height);
            setSize((previous) =>
                previous.width === width && previous.height === height ? previous : { width, height }
            );
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const element = canvas.current;
        if (!element || !width || (fit === 'page' && !height)) return;
        let cancelled = false;
        let task: RenderTask | undefined;

        const render = async () => {
            try {
                const loaded = await document.getPage(page);
                if (cancelled) return;
                const original = loaded.getViewport({ scale: 1 });
                const ratio = Math.min(window.devicePixelRatio || 1, 2);
                const scale =
                    fit === 'page'
                        ? Math.min(width / original.width, height / original.height)
                        : width / original.width;
                const viewport = loaded.getViewport({ scale });
                element.width = Math.ceil(viewport.width * ratio);
                element.height = Math.ceil(viewport.height * ratio);
                element.style.width = `${viewport.width}px`;
                element.style.height = `${viewport.height}px`;
                task = loaded.render({
                    canvas: element,
                    viewport,
                    transform: [ratio, 0, 0, ratio, 0, 0],
                    annotationMode: 0
                });
                await task.promise;
                const content = await loaded.getTextContent();
                if (!cancelled) {
                    setText(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
                    setFailed(false);
                }
            } catch {
                if (!cancelled) setFailed(true);
            }
        };

        void render();
        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [document, page, width, height, fit]);

    return (
        <div
            ref={container}
            className="min-h-0 flex-1 overflow-auto"
            role="group"
            aria-label={`${title}, page ${page}`}
        >
            {failed && <span role="status">Unable to display this page.</span>}
            <canvas ref={canvas} className="mx-auto block" aria-hidden="true" hidden={failed} />
            <p className="sr-only">{text}</p>
        </div>
    );
}
