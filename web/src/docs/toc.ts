export type TocItem = {
    label: string;
    href: string;
    level: 1 | 2 | 3;
};

export const DOC_TOC: Record<string, TocItem[]> = {
    '/docs': [
        { label: 'Why', href: '#why', level: 2 },
    ],
    '/docs/api': [
        { label: 'Infrastructure', href: '#infrastructure', level: 2 },
        { label: 'Request Flow & Permissioning', href: '#request-flow-permissioning', level: 2 },
    ],
    '/docs/api/self-hosted': [
        { label: 'Infrastructure', href: '#infrastructure', level: 2 },
        { label: 'Required Environment Variables', href: '#required-environment-variables', level: 2 },
        { label: 'Session', href: '#session', level: 3 },
        { label: 'Compute', href: '#compute', level: 3 },
        { label: 'Database', href: '#database', level: 3 },
        { label: 'Storage', href: '#storage', level: 3 },
        { label: 'Deployment Model', href: '#deployment-model', level: 2 },
    ],
    '/docs/sdk': [
        { label: 'Getting Started', href: '#getting-started', level: 2 },
        { label: 'Install', href: '#install', level: 3 },
        { label: 'Initialize a Project', href: '#initialize-a-project', level: 3 },
        { label: 'Applications', href: '#applications', level: 2 },
        { label: 'Local Development', href: '#local-development', level: 2 },
        { label: 'Resources', href: '#resources', level: 2 },
    ],
    '/docs/sdk/building': [{ label: 'Build', href: '#building', level: 1 }],
    '/docs/sdk/database': [
        { label: 'Usage', href: '#usage', level: 2 },
        { label: 'Resources', href: '#resources', level: 2 },
    ],
    '/docs/sdk/environments': [
        { label: 'Usage', href: '#usage', level: 2 },
        { label: 'Resources', href: '#resources', level: 2 },
    ],
    '/docs/sdk/routes': [
        { label: 'Usage', href: '#usage', level: 2 },
        { label: 'Resources', href: '#resources', level: 2 },
    ],
    '/docs/sdk/storage': [
        { label: 'Usage', href: '#usage', level: 2 },
        { label: 'Resources', href: '#resources', level: 2 },
    ],
    '/docs/sdk/testing': [
        { label: 'Usage', href: '#usage', level: 2 },
        { label: 'Example', href: '#example', level: 2 },
        { label: 'Resources', href: '#resources', level: 2 },
    ],
    '/docs/xml': [
        { label: 'State', href: '#state', level: 2 },
        { label: 'if', href: '#if', level: 2 },
        { label: 'Query', href: '#query', level: 2 },
        { label: 'Action', href: '#action', level: 2 },
        { label: 'Expressions', href: '#expressions', level: 2 },
        { label: 'References', href: '#references', level: 2 },
        { label: 'For', href: '#for', level: 2 },
    ],
    '/docs/xml/components': [
        { label: 'Avatar', href: '#avatar', level: 2 },
        { label: 'Badge', href: '#badge', level: 2 },
        { label: 'Text', href: '#text', level: 2 },
        { label: 'Title', href: '#title', level: 2 },
        { label: 'Lists', href: '#lists', level: 2 },
        { label: 'Buttons', href: '#buttons', level: 2 },
        { label: 'Hr', href: '#hr', level: 2 },
        { label: 'Hero', href: '#hero', level: 2 },
        { label: 'Icon', href: '#icon', level: 2 },
        { label: 'Table', href: '#table', level: 2 },
    ],
    '/docs/xml/field': [
        { label: 'Input', href: '#input', level: 2 },
        { label: 'Textarea', href: '#textarea', level: 2 },
        { label: 'Select', href: '#select', level: 2 },
        { label: 'Slider', href: '#slider', level: 2 },
        { label: 'Checkbox', href: '#checkbox', level: 2 },
        { label: 'RadioGroup', href: '#radiogroup', level: 2 },
        { label: 'Switch', href: '#switch', level: 2 },
        { label: 'Toggle', href: '#toggle', level: 2 },
        { label: 'ToggleGroup', href: '#togglegroup', level: 2 },
    ],
    '/docs/xml/layout': [
        { label: 'Columns', href: '#columns', level: 2 },
        { label: 'Grid', href: '#grid', level: 2 },
        { label: 'Card', href: '#card', level: 2 },
        { label: 'Stack', href: '#stack', level: 2 },
        { label: 'Dialog', href: '#dialog', level: 2 },
        { label: 'Tabs', href: '#tabs', level: 2 },
        { label: 'Menu', href: '#menu', level: 2 },
    ],
};
