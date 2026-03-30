import { PanelsTopLeft } from 'lucide-react';
import Hero from '@/longlink/Hero';
import Table, { type ApiTableColumn } from '@/longlink/Table';
import { useSpaces } from '@/hooks/use-apps';
import { Card } from '@/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/ui/empty';

const tableSchema: { title: string; schema: { columns: ApiTableColumn[] } } = {
    title: 'Spaces',
    schema: {
        columns: [
            {
                key: 'name',
                label: 'Name',
                content: {
                    value: '{name}',
                    link: '/{id}',
                },
            },
            {
                key: 'url',
                label: 'URL',
                value: '{url}',
            },
            {
                key: 'type',
                label: 'Type',
                value: '{type}',
            },
        ],
    },
};

export default function Spaces() {
    const { data: spaces = [], isLoading, error } = useSpaces();
    const loadErrorMessage =
        error instanceof Error ? error.message : 'Failed to load spaces';

    return (
        <div className="space-y-6">
            <Hero
                title="Spaces"
                subtitle={`${spaces.length} spaces`}
                icon="folder-kanban"
            />

            {isLoading ? (
                <Card className="p-10 text-center text-white/60">
                    Loading spaces...
                </Card>
            ) : error ? (
                <Card className="p-10 text-center text-red-300">
                    {loadErrorMessage}
                </Card>
            ) : spaces.length === 0 ? (
                <Card className="p-10 text-center">
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <PanelsTopLeft className="h-5 w-5" />
                            </EmptyMedia>
                            <EmptyTitle>No Spaces Yet</EmptyTitle>
                            <EmptyDescription>
                                Spaces will help organize work into focused
                                environments for your organization.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </Card>
            ) : (
                <Table endpoint="/spaces" schema={tableSchema} />
            )}
        </div>
    );
}
