import { Workflow } from 'lucide-react';
import Hero from '@/longlink/Hero';
import Table, { type ApiTableColumn } from '@/longlink/Table';
import { useProcesses } from '@/hooks/use-apps';
import { Card } from '@/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/ui/empty';

const tableSchema: { title: string; schema: { columns: ApiTableColumn[] } } = {
    title: 'Processes',
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

export default function Processes() {
    const { data: processes = [], isLoading, error } = useProcesses();
    const loadErrorMessage = error instanceof Error ? error.message : 'Failed to load processes';

    return (
        <div className="space-y-6">
            <Hero title="Processes" subtitle={`${processes.length} processes`} icon="workflow" />

            {isLoading ? (
                <Card className="p-10 text-center text-white/60">Loading processes...</Card>
            ) : error ? (
                <Card className="p-10 text-center text-red-300">{loadErrorMessage}</Card>
            ) : processes.length === 0 ? (
                <Card className="p-10 text-center">
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Workflow className="h-5 w-5" />
                            </EmptyMedia>
                            <EmptyTitle>No Processes Yet</EmptyTitle>
                            <EmptyDescription>
                                Processes will surface reusable workflows and playbooks for your organization.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </Card>
            ) : (
                <Table endpoint="/processes" schema={tableSchema} />
            )}
        </div>
    );
}
