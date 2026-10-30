import ViewLayout from './ViewLayout';
import { Grid } from '@/components/ui/Grid';
import { Stack } from '@astryxdesign/core/Stack';

/** Documents Grid in LongLink Views. */
export default function GridPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Grid"
            isLongLinkSpecific
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Grid content.',
                },
                {
                    name: 'columns',
                    type: 'number | { minWidth: number; max?: number; repeat?: "fill" | "fit"; }',
                    description: 'Fixed column count or responsive columns with minWidth and an optional max.',
                },
                {
                    name: 'collapseBelow',
                    type: 'number',
                    description: 'View width in pixels at or below which all items use one column.',
                },
                {
                    name: 'gap',
                    type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                    description: 'Spacing between all items.',
                },
                {
                    name: 'rowGap',
                    type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                    description: 'Row spacing; overrides `gap` for the row axis.',
                },
                {
                    name: 'columnGap',
                    type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                    description: 'Column spacing; overrides `gap` for the column axis.',
                },
                {
                    name: 'align',
                    type: '"start" | "center" | "end" | "stretch"',
                    description: 'Vertical alignment of items.',
                },
                {
                    name: 'justify',
                    type: '"start" | "center" | "end" | "stretch"',
                    description: 'Horizontal alignment of items.',
                },
                {
                    name: 'width',
                    type: 'string | number',
                    description: 'Container width. Numbers are treated as pixels, strings are used as-is.',
                },
                {
                    name: 'height',
                    type: 'string | number',
                    description: 'Container height. Numbers are treated as pixels, strings are used as-is.',
                },
                {
                    name: 'maxWidth',
                    type: 'string | number',
                    description: 'Maximum container width. Numbers are treated as pixels, strings are used as-is.',
                },
                {
                    name: 'minHeight',
                    type: 'string | number',
                    description: 'Minimum container height. Numbers are treated as pixels, strings are used as-is.',
                },
                {
                    name: 'GridSpan.children',
                    type: 'ReactNode',
                    description: 'Content rendered inside the grid item.',
                },
                {
                    name: 'GridSpan.columns',
                    type: 'number | "full"',
                    description: 'Number of columns to occupy, or full to span the entire grid.',
                },
            ]}
            introduction="Grid supports fixed columns or responsive tracks with columns={{ minWidth: 240, max: 3 }}. Responsive tracks reflow with the container width; use one-column or full GridSpan items with them. For unequal fixed-column layouts, collapseBelow={768} switches to a single column at narrow View viewport widths and makes spanning children full-width."
            example={{
                title: 'Grid',
                preview: <GridExample />,
                code: `function Example() {
  return (
    <Grid columns={2} gap={3}>
      <Text>First column</Text>
      <GridSpan columns="full">
        <Text>Full-width content</Text>
      </GridSpan>
    </Grid>
  );
}`,
            }}
        />
    );
}

/** Renders the page's grid example for documentation and the catalog. */
export function GridExample() {
    // Arrange presentation-only items in two columns.
    return (
        <Grid columns={2} gap={2}>
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
        </Grid>
    );
}
