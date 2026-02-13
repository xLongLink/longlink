import { Plus, TableProperties } from 'lucide-react';
import { Hero } from '@/components/viavai/Hero';
import { Table } from '@/components/viavai/Table';
import { Button } from '@/components/ui/button';
import { sampleTableData, sampleTableSchema } from '@/lib/example-data';

export default function TablePage() {
    return (
        <div className="space-y-6">
            <Hero
                title={sampleTableSchema.title}
                subtitle={sampleTableSchema.description}
                icon={TableProperties}
                element={
                    <Button type="button" variant="outline">
                        <Plus className="h-4 w-4" />
                        New Invoice
                    </Button>
                }
            />
            <Table schema={sampleTableSchema} data={sampleTableData} />
        </div>
    );
}
