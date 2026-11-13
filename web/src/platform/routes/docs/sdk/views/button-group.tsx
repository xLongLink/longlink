import ViewLayout from './view-layout';
import { Button } from '@/components/shadcn/button';
import { ButtonGroup } from '@/components/shadcn/button-group';

export default function ButtonGroupPage() {
    return (
        <ViewLayout
            name="ButtonGroup"
            properties={[
                { name: 'orientation', type: '"horizontal" | "vertical"', description: 'Connected button layout.' },
                { name: 'aria-label', type: 'string', description: 'Accessible group label.' },
                { name: 'children', type: 'ReactNode', description: 'Native Button or composed control children.' }
            ]}
            example={{
                title: 'Button group',
                preview: <ButtonGroupExample />,
                code: `<ButtonGroup aria-label="Actions">
  <Button variant="outline">Save</Button>
  <Button variant="outline">Cancel</Button>
</ButtonGroup>`
            }}
        />
    );
}

export function ButtonGroupExample() {
    return (
        <ButtonGroup aria-label="Actions">
            <Button variant="outline">Save</Button>
            <Button variant="outline">Cancel</Button>
        </ButtonGroup>
    );
}
