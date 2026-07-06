import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('A', () => {
    /* App navigation targets should resolve against the view route base, not the API request base. */
    it('renders app navigation anchors', () => {
        const output = renderXmlToMarkup(
            parseXML('<A to="/issues/123" i18n="anchors.openIssue" />'),
            {
                invalidate: async () => {},
                navigationBaseUrl: '/orgs/acme/apps/tracker',
                setups: {},
                values: {},
            },
            '/api/applications/app-1/proxy'
        );

        expect(output).toContain('href="/orgs/acme/apps/tracker/issues/123"');
        expect(output).toContain('Open issue');
    });

    /* Internal anchors should resolve against the active XML base URL. */
    it('resolves internal anchors against the base url', () => {
        const output = renderXmlToMarkup(
            parseXML('<A href="/files/document.pdf" i18n="anchors.download" />'),
            { setups: {}, invalidate: async () => {}, values: {} },
            '/orgs/acme/apps/inventory'
        );

        expect(output).toContain('href="/orgs/acme/apps/inventory/files/document.pdf"');
    });

});
