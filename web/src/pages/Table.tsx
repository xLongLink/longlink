import { Table } from '@/components/viavai/Table';
import { sampleTableData, sampleTableSchema } from '@/lib/example-data';

export default function TablePage() {
    return <Table schema={sampleTableSchema} data={sampleTableData} />;
}
