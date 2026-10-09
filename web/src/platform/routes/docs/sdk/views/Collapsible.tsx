import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Collapsible } from '@/components/ui/Collapsible';

/** Documents Collapsible in LongLink Views. */
export default function CollapsiblePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Collapsible"
            examples={[
                {
                    title: 'Collapsible',
                    preview: <CollapsibleExample />,
                    code: `function Example() {
  return (
    <Collapsible trigger="Details">
      <Text>Additional information</Text>
    </Collapsible>
  );
}`,
                },
            ]}
        />
    );
}

/** Lets the disclosure own its initially expanded state. */
export function CollapsibleExample() {
    // Expand or collapse the additional information on demand.
    return (
        <Collapsible trigger="Details">
            <Text color="secondary">Additional information.</Text>
        </Collapsible>
    );
}
