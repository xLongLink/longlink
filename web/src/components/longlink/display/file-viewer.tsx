import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RequestContext } from '@/views/contexts';
import { Spinner } from '@/components/shadcn/spinner';
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
    const request = useContext(RequestContext)?.request;
    const { data, error, isError } = useQuery({
        queryKey: ['files', src],
        queryFn: async () => {
            if (!request) throw new Error('File preview unavailable');
            const body = await request(src, { binary: true });
            if (!(body instanceof Blob)) throw new Error('File preview unavailable');
            return body;
        },
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false
    });

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
