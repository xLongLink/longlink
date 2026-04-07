import { Sparkles } from 'lucide-react';
import Hero from '@/longlink/Hero';
import Table, { type ApiTableColumn } from '@/longlink/Table';
import { Card } from '@/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/ui/empty';
import { useTools } from '@/hooks/use-apps';

const tableSchema: { title: string; schema: { columns: ApiTableColumn[] } } = {
    title: 'Tools',
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

export default function Tools() {
    const { data: tools = [], isLoading, error } = useTools();
    const loadErrorMessage = error instanceof Error ? error.message : 'Failed to load tools';

    return (
        <div className="space-y-6">
            <Hero title="Tools" subtitle={`${tools.length} tools`} icon="blocks" />

            {isLoading ? (
                <Card className="p-10 text-center text-white/60">Loading tools...</Card>
            ) : error ? (
                <Card className="p-10 text-center text-red-300">{loadErrorMessage}</Card>
            ) : tools.length === 0 ? (
                <Card className="p-10 text-center">
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Sparkles className="h-5 w-5" />
                            </EmptyMedia>
                            <EmptyTitle>No Tools Yet</EmptyTitle>
                            <EmptyDescription>There are no tools available for this organization.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </Card>
            ) : (
                <Table endpoint="/apps?type=tool" schema={tableSchema} />
            )}
        </div>
    );
}
