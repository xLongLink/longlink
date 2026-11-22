import { Spinner } from '@/components/shadcn/spinner';
import { useBinaryQuery } from '@/lib/hooks/use-binary-query';
import { FilePreview } from '@/components/longlink/display/file-preview';

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
    const { data, error, isError } = useBinaryQuery(src);

    // Keep one bounded viewer region with no custom View or Download buttons.
    return (
        <div className="flex h-96 w-full min-w-0 items-center justify-center" aria-label={title}>
            {data ? (
                <FilePreview key={src} body={data} title={title} />
            ) : isError ? (
                <span role="status">{error instanceof Error ? error.message : 'File preview failed'}</span>
            ) : (
                <Spinner role="progressbar" aria-label={`Loading ${title}`} />
            )}
        </div>
    );
}
