import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Grid',
    slug: 'grid',
    category: 'Layout',
    summary: 'Creates fixed or responsive multi-column layouts.',
    usage: 'Use Grid for card galleries, dashboards, and column-based content.',
    attributes: [
        {
            name: 'columns',
            description: 'Fixed number of columns.',
        },
        {
            name: 'minColumnWidth',
            description: 'Minimum responsive column width.',
        },
        {
            name: 'maxColumns',
            description: 'Maximum responsive column count.',
        },
        {
            name: 'repeat',
            description: 'fill or fit.',
        },
        {
            name: 'gap',
            description: 'Astryx spacing value.',
        },
    ],
    children: 'Any rendered XML content.',
    example:
        '<Grid minColumnWidth="240" maxColumns="3" repeat="fit" gap="4">\n  <Card><Text value="First" /></Card>\n  <Card><Text value="Second" /></Card>\n</Grid>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/grid.tsx',
};
