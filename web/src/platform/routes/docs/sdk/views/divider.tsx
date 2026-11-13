import ViewLayout from './view-layout';
import { Divider } from '@/components/custom/divider';
import { Separator } from '@/components/shadcn/separator';

/** Documents Divider in LongLink Views. */
export default function DividerPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Divider"
            properties={[
                { name: 'label', type: 'ReactNode', description: 'Required label centered between decorative lines.' },
                { name: 'orientation', type: '"horizontal" | "vertical"', description: 'Orientation of the divider.' },
                {
                    name: 'Separator',
                    type: 'shadcn Separator props',
                    description: 'Use the native Separator for unlabeled lines, with HTML attributes and orientation.'
                }
            ]}
            example={{
                title: 'Divider',
                preview: <DividerExample />,
                code: `function Example() {
  return (
    <Stack gap={3}>
      <Text>Before</Text>
      <Separator />
      <Text>After</Text>
      <Divider label="or" />
    </Stack>
  );
}`
            }}
        />
    );
}

/** Renders the page's divider example for documentation and the catalog. */
export function DividerExample() {
    // Display the standard content separator.
    return (
        <>
            <Separator />
            <Divider label="or" />
        </>
    );
}
