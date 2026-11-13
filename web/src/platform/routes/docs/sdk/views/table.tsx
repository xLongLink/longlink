import ViewLayout from './view-layout';
import { ModelDirectory } from '@/components/custom/model-directory';
import modelDirectorySource from '@/components/custom/model-directory?raw';

/** Documents data-driven tables in LongLink Views. */
export default function TablePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DataTable"
            properties={[
                { name: 'data', type: 'T[]', description: 'Data objects displayed as rows.' },
                {
                    name: 'hasHover',
                    type: 'boolean',
                    description: 'Applies a hover highlight background to rows on pointer devices.'
                },
                { name: 'isStriped', type: 'boolean', description: 'Applies a background wash to even-numbered rows.' },
                {
                    name: 'columns',
                    type: '{ key: string; header?: ReactNode; width?: ColumnWidth; align?: "start" | "center" | "end"; renderCell?: ((row: T) => ReactNode); }[]',
                    description: 'Columns with custom cells and proportional() or pixel() widths.'
                }
            ]}
            example={{
                title: 'Model directory',
                preview: <ModelDirectory />,
                code: modelDirectorySource,
                language: 'tsx'
            }}
        />
    );
}
