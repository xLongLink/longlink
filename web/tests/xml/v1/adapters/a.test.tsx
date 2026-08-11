import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/v1/core/parser';
import { renderXmlToMarkup } from '../helpers';

describe('Link', () => {
    /* App navigation targets should resolve against the view route base, not the API request base. */
    it('renders app navigation and internal anchors', () => {
        const navigationOutput = renderXmlToMarkup(
            parseXML('<Link to="/issues/123" />'),
            {
                scope: { bindings: {} },
                services: {
                    invalidate: async () => {},
                    navigationBaseUrl: '/orgs/acme/apps/tracker',
                    requestBaseUrl: '',
                    setups: {},
                },
            },
            '/api/applications/app-1/proxy'
        );
        const anchorOutput = renderXmlToMarkup(
            parseXML('<Link href="/files/document.pdf" />'),
            {
                scope: { bindings: {} },
                services: {
                    invalidate: async () => {},
                    navigationBaseUrl: '',
                    requestBaseUrl: '',
                    setups: {},
                },
            },
            '/orgs/acme/apps/inventory'
        );

        expect(navigationOutput).toContain('href="/orgs/acme/apps/tracker/issues/123"');
        expect(anchorOutput).toContain('href="/orgs/acme/apps/inventory/files/document.pdf"');
    });
});
