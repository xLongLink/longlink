import * as host from '@/views/host';
import ViewLayout from './ViewLayout';
import { FileViewer, FileRequestContext } from '@/components/ui/FileViewer';

/** Documents image previews and attachment downloads through the scoped Solution API. */
export default function FileViewerPage() {
    // Render image preview guidance and an authored example.
    return (
        <ViewLayout
            name="FileViewer"
            reference={{
                introduction:
                    'FileViewer previews images and downloads attachments through the scoped Solution API. Other documents, including PDFs, are downloaded rather than executed inside the View.',
                practices: [
                    {
                        guidance: true,
                        description:
                            'Set title to the attachment filename and src to its Solution endpoint. Downloads and previews are bounded to 2,000,000 bytes. Unsupported image types use the download action.',
                    },
                ],
            }}
            examples={[
                {
                    title: 'FileViewer',
                    preview: <FileViewerExample />,
                    code: `function Example() {
  return <FileViewer src="/api/items/123/image" title="invoice.png" />;
}`,
                },
            ]}
        />
    );
}

/** Supplies a public sample image without making requests to a Solution API. */
async function requestPreviewImage() {
    // Use a fixed documentation asset rather than a user-supplied endpoint.
    const response = await fetch('/images/introducing-longlink.png');

    if (!response.ok) throw new Error('Could not load the preview image');

    return response.blob();
}

/** Demonstrates the real attachment lifecycle using a public sample image. */
export function FileViewerExample() {
    // Scope the sample request capability to this example.
    return (
        <FileRequestContext
            value={{
                preview: requestPreviewImage,
                download: async (_path, filename) => {
                    // The native example can only download this fixed public documentation asset.
                    await host.download(
                        '/',
                        { type: 'download', id: 0, path: '/images/introducing-longlink.png', filename },
                        new AbortController().signal
                    );
                },
            }}
        >
            <FileViewer src="/api/items/123/image" title="invoice.png" />
        </FileRequestContext>
    );
}
