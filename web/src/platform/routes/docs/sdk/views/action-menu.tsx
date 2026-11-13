import { useState } from 'react';
import ViewLayout from './view-layout';
import { Copy, Ellipsis } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { ActionMenu } from '@/components/custom/action-menu';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';

/** Documents ActionMenu in LongLink Views. */
export default function ActionMenuPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="ActionMenu"
            properties={[
                {
                    name: 'trigger',
                    type: 'ReactElement<ComponentProps<typeof Button>>',
                    description:
                        'Native Button with its own children, variant, size, disabled state, and accessible label. Defaults to an outline Actions button.'
                },
                {
                    name: 'items',
                    type: 'ActionMenuOption[]',
                    description:
                        'Actions, links, dividers, and sections. Items support disabled, closeOnClick, and icon names or elements.'
                },
                { name: 'open', type: 'boolean', description: 'Controlled menu open state.' },
                {
                    name: 'align',
                    type: '"start" | "center" | "end"',
                    description: 'Popup alignment relative to the trigger.'
                },
                {
                    name: 'onOpenChange',
                    type: '(isOpen: boolean) => void',
                    description: 'Callback fired when the open state changes.'
                }
            ]}
            example={{
                title: 'ActionMenu',
                preview: <ActionMenuExample />,
                code: `function Example() {
  const [action, setAction] = useState('');

  return (
    <Stack gap={2}>
      <ActionMenu
        trigger={<Button type="button" variant="outline" size="sm">Edit</Button>}
        items={[
          { label: 'Copy', onClick: () => setAction('Copied') },
          { label: 'Paste', onClick: () => setAction('Pasted') }
        ]}
      />
      <ActionMenu
        trigger={<Button type="button" variant="ghost" size="icon-sm" aria-label="Order actions"><Icon icon="ellipsis" size="sm" /></Button>}
        align="end"
        items={[
          { label: 'Copy', closeOnClick: false, icon: <Icon icon="copy" size="sm" />, onClick: () => setAction('Copied') },
          { label: 'Delete', disabled: true }
        ]}
      />
      {action && <Text role="status">{action}</Text>}
    </Stack>
  );
}`
            }}
        />
    );
}

/** Demonstrates menu actions with feedback confined to the example. */
export function ActionMenuExample() {
    const [action, setAction] = useState('');

    // Report simulated actions without changing the clipboard.
    return (
        <Stack gap={2}>
            <ActionMenu
                trigger={
                    <Button type="button" variant="outline" size="sm">
                        Edit
                    </Button>
                }
                items={[
                    { label: 'Copy', onClick: () => setAction('Copied') },
                    { label: 'Paste', onClick: () => setAction('Pasted') }
                ]}
            />
            <ActionMenu
                trigger={
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Order actions">
                        <Ellipsis aria-hidden="true" />
                    </Button>
                }
                align="end"
                items={[
                    {
                        label: 'Copy',
                        closeOnClick: false,
                        icon: <Copy aria-hidden="true" />,
                        onClick: () => setAction('Copied')
                    },
                    { label: 'Delete', disabled: true }
                ]}
            />
            {action && <Text role="status">{action}</Text>}
        </Stack>
    );
}
