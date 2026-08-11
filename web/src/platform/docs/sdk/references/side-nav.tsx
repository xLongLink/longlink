import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'SideNav',
    slug: 'side-nav',
    category: 'Layout',
    summary: 'Renders application navigation in a sidebar container.',
    usage: 'Use SideNav when an XML page owns a local navigation list.',
    attributes: [
        {
            name: 'label or i18n',
            description: 'Accessible navigation label.',
            required: true,
        },
    ],
    children: 'SideNavItem children.',
    example:
        '<SideNav label="Application navigation">\n  <SideNavItem value="/orders" label="Orders" />\n  <SideNavItem value="/customers" label="Customers" />\n</SideNav>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/side-nav.tsx',
};
