import ViewLayout from './view-layout';
import { RequestContext } from '@/lib/view-capabilities';
import { Box, Button, Dialog, FileViewer } from '@/components/longlink';

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
  return (
    <Dialog title="Report" fullscreen trigger={<Button>Open report</Button>}>
      <Box width="100%" height="100%">
        <FileViewer src="/api/reports/latest" title="report.pdf" fit="page" />
      </Box>
    </Dialog>
  );
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
function FileViewerExample() {
    // Scope the sample request capability to this example.
    return (
        <RequestContext value={requestPreviewFile}>
            <Dialog title="Report" fullscreen trigger={<Button>Open report</Button>}>
                <Box width="100%" height="100%">
                    <FileViewer src="/api/reports/latest" title="report.pdf" fit="page" />
                </Box>
            </Dialog>
        </RequestContext>
    );
}
