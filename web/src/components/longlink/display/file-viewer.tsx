import { Spinner } from '@/components/shadcn/spinner';
import { useBinaryQuery } from '@/lib/hooks/use-binary-query';
import { FilePreview } from '@/components/longlink/display/file-preview';

/** Displays supported attachments inside the View using scoped file requests. */
export function FileViewer({
    src,
    title,
    fit = 'width'
}: {
    /** Scoped Solution operation path returning the file to preview. */
    src: string;
    /** Accessible name for the embedded file. */
    title: string;
    /** Fits PDF pages to the viewer width or the available width and height. */
    fit?: 'width' | 'page';
}) {
    const { data, error, isError } = useBinaryQuery(src);

    return (
        <div className="flex size-full min-h-0 min-w-0 items-center justify-center" aria-label={title}>
            {data ? (
                <FilePreview body={data} title={title} fit={fit} />
            ) : isError ? (
                <span role="status">{error instanceof Error ? error.message : 'File preview failed'}</span>
            ) : (
                <Spinner role="progressbar" aria-label={`Loading ${title}`} />
            )}
        </div>
    );
}
