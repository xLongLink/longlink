import { Plus } from 'lucide-react';
import { Hero } from '@/components/viavai/Hero';
import { Table } from '@/components/viavai/Table';
import { Button } from '@/components/ui/button';
import { sampleTableData, sampleTableSchema } from '@/lib/example-data';

export default function TablePage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <Hero
                    title={sampleTableSchema.title}
                    subtitle={sampleTableSchema.description}
                />
                <Button type="button" variant="outline">
                    <Plus className="h-4 w-4" />
                    New Invoice
                </Button>
            </div>
            <Table schema={sampleTableSchema} data={sampleTableData} />
        </div>
    );
}
