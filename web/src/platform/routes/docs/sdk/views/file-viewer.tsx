import ViewLayout from './view-layout';
import { FileViewer } from '@/components/longlink';
import { RequestContext } from '@/lib/view-capabilities';

/** Documents inline file previews through the scoped Solution API. */
export default function FileViewerPage() {
    // Render file preview guidance and an authored example.
    return (
        <ViewLayout
            name="FileViewer"
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
        <RequestContext
            value={{
                request: requestPreviewFile,
                download: async () => {
                    throw new Error('Downloads are unavailable in this documentation example');
                }
            }}
        >
            <FileViewer src="/api/reports/latest" title="report.pdf" />
        </RequestContext>
    );
}
