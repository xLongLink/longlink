import ViewLayout from './ViewLayout';
import { ActionButton } from '@/components/custom/ActionButton';
import { ActionButtonGroup } from '@/components/custom/ActionButtonGroup';

export default function ActionButtonGroupPage() {
    return (
        <ViewLayout
            name="ActionButtonGroup"
            properties={[
                { name: 'label', type: 'string', description: 'Accessible group label.' },
                {
                    name: 'orientation',
                    type: '"horizontal" | "vertical"',
                    description: 'Layout and keyboard navigation direction.'
                },
                { name: 'size', type: '"sm" | "default" | "lg"', description: 'Inherited action size.' },
                { name: 'isDisabled', type: 'boolean', description: 'Disables every grouped action.' }
            ]}
            example={{
                title: 'Action group',
                preview: <ActionButtonGroupExample />,
                code: `<ActionButtonGroup label="Actions">
  <ActionButton variant="outline">Save</ActionButton>
  <ActionButton variant="outline">Cancel</ActionButton>
</ActionButtonGroup>`
            }}
        />
    );
}

export function ActionButtonGroupExample() {
    return (
        <ActionButtonGroup label="Actions">
            <ActionButton variant="outline">Save</ActionButton>
            <ActionButton variant="outline">Cancel</ActionButton>
        </ActionButtonGroup>
    );
}
