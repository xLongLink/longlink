import { Button } from '@/components/shadcn/button';
import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/shadcn/spinner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';

/** Renders PDF bytes locally without native plugins or document navigation. */
export function PdfFile({ body, title }: { body: Blob; title: string }) {
    const [result, setResult] = useState<{ body: Blob; document: PDFDocumentProxy | Error }>();
    const document = result?.body === body ? result.document : undefined;

    // Each document owns its bundled worker and releases it on replacement or unmount.
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
                    setResult({ body, document: new Error('Unable to display this PDF.') });
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
                if (!cancelled) setResult({ body, document: loaded });
            } catch {
                if (!cancelled) {
                    setResult({ body, document: new Error('Unable to display this PDF.') });
                    dispose();
                }
            }
        }

        void load();
        return dispose;
    }, [body]);

    if (document instanceof Error) return <span role="status">{document.message}</span>;
    if (!document) return <Spinner role="progressbar" aria-label={`Loading ${title}`} />;

    return <PdfDocument document={document} title={title} />;
}

/** Keeps page navigation within one successfully loaded document. */
function PdfDocument({ document, title }: { document: PDFDocumentProxy; title: string }) {
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
            <PdfPage key={page} document={document} page={page} title={title} />
        </div>
    );
}

/** Fits one page to the viewer and cancels obsolete canvas work after resizing. */
function PdfPage({ document, page, title }: { document: PDFDocumentProxy; page: number; title: string }) {
    const container = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const [width, setWidth] = useState(0);
    const [text, setText] = useState('');
    const [failed, setFailed] = useState(false);

    // Observe the actual inline slot instead of transferring its geometry to the host.
    useEffect(() => {
        const element = container.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    // Keep raster output and accessible page text local to the isolated document.
    useEffect(() => {
        const element = canvas.current;
        if (!element || !width) return;
        let cancelled = false;
        let task: RenderTask | undefined;

        async function render() {
            try {
                const loaded = await document.getPage(page);
                if (cancelled || !element) return;
                const original = loaded.getViewport({ scale: 1 });
                const ratio = Math.min(window.devicePixelRatio || 1, 2);
                const viewport = loaded.getViewport({ scale: width / original.width });
                element.width = Math.ceil(viewport.width * ratio);
                element.height = Math.ceil(viewport.height * ratio);
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
        }

        void render();
        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [document, page, width]);

    return (
        <div
            ref={container}
            className="min-h-0 flex-1 overflow-auto"
            role="group"
            aria-label={`${title}, page ${page}`}
        >
            {failed && <span role="status">Unable to display this page.</span>}
            <canvas ref={canvas} className="block h-auto w-full" aria-hidden="true" hidden={failed} />
            <p className="sr-only">{text}</p>
        </div>
    );
}
