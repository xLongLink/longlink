const GITHUB_EDIT_BASE = 'https://github.com/xLongLink/longlink/edit/main/web/docs';

const DOC_LAST_UPDATED: Record<string, string> = {
    '/docs': '2026-05-25',
    '/docs/api': '2026-05-25',
    '/docs/api/self-hosted': '2026-05-25',
    '/docs/sdk': '2026-05-25',
    '/docs/sdk/building': '2026-05-25',
    '/docs/sdk/database': '2026-05-25',
    '/docs/sdk/environments': '2026-05-25',
    '/docs/sdk/routes': '2026-05-25',
    '/docs/sdk/storage': '2026-05-25',
    '/docs/sdk/testing': '2026-05-26',
    '/docs/xml': '2026-05-26',
    '/docs/xml/components': '2026-05-26',
    '/docs/xml/layout': '2026-05-26',
};

/** Returns the GitHub edit URL for a docs route. */
export function getDocsEditUrl(path: string) {
    const sourcePath = path === '/docs' ? '/index.md' : `${path.replace(/^\/docs/, '')}.md`;

    return `${GITHUB_EDIT_BASE}${sourcePath}`;
}

/** Returns the last updated date for a docs route. */
export function getDocsLastUpdated(path: string) {
    return DOC_LAST_UPDATED[path] ?? '';
}
