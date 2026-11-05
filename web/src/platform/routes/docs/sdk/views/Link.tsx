import ViewLayout from './ViewLayout';
import { Link } from '@/components/ui/Link';

/** Documents Link in LongLink Views. */
export default function LinkPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Link"
            introduction={
                'Navigates within the Solution or opens an external HTTP(S) URL in a new tab. Set download to a filename to save a scoped Solution attachment without navigating or showing a preview. An empty string uses attachment. Downloads retain scoped authentication and authorization; external URLs are not supported for downloads.'
            }
            properties={[
                {
                    name: 'to',
                    type: 'string',
                    description: 'Link destination.',
                },
                {
                    name: 'download',
                    type: 'string',
                    description: 'Download filename for a scoped Solution attachment instead of navigation.',
                },
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Link content',
                },
            ]}
            example={{
                title: 'Link',
                preview: <LinkExample />,
                code: `function Example() {
  return (
    <Stack>
      <Link to="/orders">Orders</Link>
      <Link to="/api/documents/sample" download="sample-document.txt">
        sample-document.txt
      </Link>
    </Stack>
  );
}`,
            }}
        />
    );
}

/** Demonstrates navigation to an existing documentation page. */
export function LinkExample() {
    // Avoid navigating to a nonexistent Solution route from the example.
    return <Link to="/docs/sdk/views">Docs</Link>;
}
