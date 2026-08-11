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

    it('drops unsafe expression-backed navigation targets and falls back to a safe href', () => {
        const output = renderXmlToMarkup(
            parseXML('<Link to="${destination}" href="${fallback}" />'),
            {
                scope: { bindings: { destination: 'javascript:alert(1)', fallback: '/files/document.pdf' } },
                services: {
                    invalidate: async () => {},
                    navigationBaseUrl: '/orgs/acme/apps/tracker',
                    requestBaseUrl: '',
                    setups: {},
                },
            },
            '/orgs/acme/apps/tracker'
        );

        expect(output).toContain('href="/orgs/acme/apps/tracker/files/document.pdf"');
        expect(output).not.toContain('javascript:');
    });
});
