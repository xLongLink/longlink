import ViewLayout from './view-layout';
import { FolderCode } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/shadcn/empty';

/** Documents shadcn Empty in LongLink Views. */
export default function EmptyPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Empty"
            properties={[
                {
                    name: 'Empty.children',
                    type: 'ReactNode',
                    description: 'Compose EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, and EmptyMedia.'
                },
                { name: 'Empty.className', type: 'string', description: 'Native div props are forwarded unchanged.' }
            ]}
            example={{
                title: 'Native composition',
                preview: <EmptyExample />,
                code: `function Example() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon icon="folder-code" size="md" />
        </EmptyMedia>
        <EmptyTitle>No Projects Yet</EmptyTitle>
        <EmptyDescription>
          You haven't created any projects yet. Get started by creating your first project.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Stack direction="horizontal" gap={2}>
          <Button type="button">Create Project</Button>
          <Button type="button" variant="outline">Import Project</Button>
        </Stack>
      </EmptyContent>
    </Empty>
  );
}`
            }}
        />
    );
}

/** Renders the page's empty-state example for documentation and the catalog. */
export function EmptyExample() {
    // Show the shadcn project example with its media and action composition.
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FolderCode aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No Projects Yet</EmptyTitle>
                <EmptyDescription>
                    You haven't created any projects yet. Get started by creating your first project.
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Stack direction="horizontal" gap={2}>
                    <Button type="button">Create Project</Button>
                    <Button type="button" variant="outline">
                        Import Project
                    </Button>
                </Stack>
            </EmptyContent>
        </Empty>
    );
}
