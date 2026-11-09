import * as host from '@/views/host';
import ViewLayout from './ViewLayout';
import { FileViewer } from '@/components/ui/FileViewer';
import { FileRequestContext } from '@/components/ui/preview';

/** Documents file previews and attachment downloads through the scoped Solution API. */
export default function FileViewerPage() {
    // Render file preview guidance and an authored example.
    return (
        <ViewLayout
            name="FileViewer"
            isLongLinkSpecific
            properties={[
                {
                    name: 'src',
                    type: 'string',
                    description: 'Scoped Solution operation path returning the file to preview.',
                },
                {
                    name: 'title',
                    type: 'string',
                    description: 'Attachment name used for accessible action labels and the downloaded filename.',
                },
                {
                    name: 'size',
                    type: '"sm" | "lg" | "md"',
                    description: 'Preview and download action size; inherits sizing when omitted.',
                },
            ]}
            introduction={
                'FileViewer previews images inline, opens PDFs in a fullscreen dialog using the browser’s native PDF viewer, and shows text and code files in a read-only viewer with line numbers, wrapping, and a copy button. Syntax highlighting follows the title’s filename extension, including Python, JavaScript, TypeScript, JSON, YAML, HTML, CSS, SQL, Markdown, and other Astryx-supported languages. Text files must use UTF-8 encoding; unknown filenames with a text media type appear as plain text. PDF responses must use Content-Type: application/pdf. Other documents, including PowerPoint and Word files, are download-only. Native PDF controls and availability depend on the browser; Download remains available for every file. Set size="sm" for compact table actions; omit size to retain inherited sizing.'
            }
            example={{
                title: 'FileViewer',
                preview: <FileViewerExample />,
                code: `function Example() {
  return <FileViewer src="/api/items/123/image" title="invoice.png" />;
}`,
            }}
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
