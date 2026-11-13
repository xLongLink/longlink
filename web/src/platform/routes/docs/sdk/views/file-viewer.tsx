import * as host from '@/views/host';
import ViewLayout from './view-layout';
import { FileViewer } from '@/components/custom/file-viewer';
import { FileRequestContext } from '@/components/custom/preview';

/** Documents inline file previews through the scoped Solution API. */
export default function FileViewerPage() {
    // Render file preview guidance and an authored example.
    return (
        <ViewLayout
            name="FileViewer"
            properties={[
                {
                    name: 'src',
                    type: 'string',
                    description: 'Scoped Solution operation path returning the file to preview.'
                },
                { name: 'title', type: 'string', description: 'Accessible name for the embedded file.' }
            ]}
            example={{
                title: 'FileViewer',
                preview: <FileViewerExample />,
                code: `function Example() {
  return <FileViewer src="/api/reports/latest" title="report.pdf" />;
}`
            }}
        />
    );
}

/** Supplies a public sample PDF without making requests to a Solution API. */
async function requestPreviewFile() {
    // Use a fixed documentation asset rather than a user-supplied endpoint.
    const response = await fetch('/files/sample.pdf');

    if (!response.ok) throw new Error('Could not load the preview PDF');

    return response.blob();
}

/** Demonstrates the real attachment lifecycle using a public sample PDF. */
export function FileViewerExample() {
    // Scope the sample request capability to this example.
    return (
        <FileRequestContext
            value={{
                preview: requestPreviewFile,
                download: async (_path, filename) => {
                    // The native example can only download this fixed public documentation asset.
                    await host.download(
                        '/',
                        { type: 'download', id: 0, path: '/files/sample.pdf', filename },
                        new AbortController().signal
                    );
                }
            }}
        >
            <FileViewer src="/api/reports/latest" title="report.pdf" />
        </FileRequestContext>
    );
}
