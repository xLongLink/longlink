import ViewLayout from './ViewLayout';
import { FileViewer, FileRequestContext } from '@/components/ui/FileViewer';

/** Documents image previews through the scoped Solution API. */
export default function FileViewerPage() {
    // Render image preview guidance and an authored example.
    return (
        <ViewLayout
            name="FileViewer"
            reference={{
                introduction: 'FileViewer opens an image attachment preview through the scoped Solution API.',
                properties: [
                    {
                        name: 'src',
                        type: 'string',
                        required: true,
                        description: 'Scoped Solution operation path returning the image to preview.',
                    },
                    {
                        name: 'title',
                        type: 'string',
                        required: true,
                        description: 'Accessible label for the preview trigger and image.',
                    },
                ],
                practices: [
                    {
                        guidance: true,
                        description:
                            'Use a descriptive title and an image endpoint in your Solution. Other file types cannot be previewed.',
                    },
                ],
            }}
            examples={[
                {
                    title: 'FileViewer',
                    preview: <FileViewerExample />,
                    code: `function Example() {
  return <FileViewer src="/api/items/123/image" title="View image" />;
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
        <FileRequestContext.Provider value={requestPreviewImage}>
            <FileViewer src="/api/items/123/image" title="View image" />
        </FileRequestContext.Provider>
    );
}
