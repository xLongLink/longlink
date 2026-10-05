import ViewLayout from './ViewLayout';

/** Documents image previews through the scoped Solution API. */
export default function FileViewerPage() {
    // Render image preview guidance and an authored example.
    return (
        <ViewLayout
            name="FileViewer"
            reference={{
                introduction: 'FileViewer opens an image attachment preview through the scoped Solution API.',
                properties: [],
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
                    code: `function Example() {
  return <FileViewer src="/api/items/123/image" title="View image" />;
}`,
                },
            ]}
        />
    );
}
