import ViewLayout from './view-layout';
import { Empty, Button } from '@/components/longlink';

/** Documents Empty in LongLink Views. */
export default function EmptyPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Empty"
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
function EmptyExample() {
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
