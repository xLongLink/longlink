import ViewLayout from './view-layout';
import { Empty } from '@/components/longlink/empty';
import { Button } from '@/components/shadcn/button';

/** Documents Empty in LongLink Views. */
export default function EmptyPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Empty"
            properties={[
                {
                    name: 'icon',
                    type: 'IconName | URL string',
                    description: 'Optional Lucide icon name or an HTTP(S) or root-relative image URL.'
                },
                { name: 'title', type: 'ReactNode', description: 'Empty-state title.' },
                { name: 'description', type: 'ReactNode', description: 'Optional empty-state description.' },
                { name: 'children', type: 'ReactNode', description: 'Optional actions below the description.' }
            ]}
            example={{
                title: 'Project actions',
                preview: <EmptyExample />,
                code: `function Example() {
  return (
    <Empty
      icon="folder-code"
      title="No Projects Yet"
      description="You haven't created any projects yet. Get started by creating your first project."
    >
      <Button type="button">Create Project</Button>
      <Button type="button" variant="outline">Import Project</Button>
    </Empty>
  );
}`
            }}
        />
    );
}

/** Renders the page's empty-state example for documentation and the catalog. */
export function EmptyExample() {
    // Show the project empty state with its actions.
    return (
        <Empty
            icon="folder-code"
            title="No Projects Yet"
            description="You haven't created any projects yet. Get started by creating your first project."
        >
            <Button type="button">Create Project</Button>
            <Button type="button" variant="outline">
                Import Project
            </Button>
        </Empty>
    );
}
