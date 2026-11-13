import ViewLayout from './ViewLayout';
import { Button } from '@/components/ui/Button';
import { NativeText as Text } from '@/components/ui/NativeText';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/Collapsible';

/** Documents Collapsible in LongLink Views. */
export default function CollapsiblePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Collapsible"
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'CollapsibleTrigger and CollapsibleContent elements.'
                },
                { name: 'defaultOpen', type: 'boolean', description: 'Initial open state.' },
                { name: 'open', type: 'boolean', description: 'Controlled open state.' },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Prevents toggling without changing the open state.'
                },
                {
                    name: 'onOpenChange',
                    type: '(open: boolean, eventDetails) => void',
                    description: 'Requests an open-state change.'
                },
                {
                    name: 'CollapsibleTrigger.render',
                    type: 'ReactElement',
                    description: 'Custom trigger element, such as a Button.'
                },
                {
                    name: 'CollapsibleContent.keepMounted',
                    type: 'boolean',
                    description: 'Keeps hidden content mounted to preserve local state. Defaults to false.'
                }
            ]}
            example={{
                title: 'Collapsible',
                preview: <CollapsibleExample />,
                code: `function Example() {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger render={<Button variant="outline" />}>
        Details
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted>
        <Text>Additional information</Text>
      </CollapsibleContent>
    </Collapsible>
  );
}`
            }}
        />
    );
}

/** Lets the disclosure own its initially expanded state. */
export function CollapsibleExample() {
    // Expand or collapse the additional information on demand.
    return (
        <Collapsible defaultOpen>
            <CollapsibleTrigger render={<Button variant="outline" />}>Details</CollapsibleTrigger>
            <CollapsibleContent keepMounted>
                <Text color="secondary">Additional information.</Text>
            </CollapsibleContent>
        </Collapsible>
    );
}
