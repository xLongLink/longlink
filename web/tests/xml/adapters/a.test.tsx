import { describe, expect, it } from 'bun:test';
import { parseXML } from '@/xml/core/parser';
import { renderXmlToMarkup } from '../helpers';

const translations = {
    'anchors.download': { defaultMessage: 'Download' },
    'anchors.labelOnly': { defaultMessage: 'Label only' },
    'anchors.openIssue': { defaultMessage: 'Open issue' },
};

describe('Link', () => {
    /* App navigation targets should resolve against the view route base, not the API request base. */
    it('renders app navigation anchors', () => {
        const output = renderXmlToMarkup(
            parseXML('<Link to="/issues/123" i18n="anchors.openIssue" />'),
            {
                invalidate: async () => {},
                navigationBaseUrl: '/orgs/acme/apps/tracker',
                setups: {},
                translations,
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
            parseXML('<Link href="/files/document.pdf" i18n="anchors.download" />'),
            { setups: {}, invalidate: async () => {}, translations, values: {} },
            '/orgs/acme/apps/inventory'
        );

        expect(output).toContain('href="/orgs/acme/apps/inventory/files/document.pdf"');
    });

    it('omits href from unsafe anchors', () => {
        const unsafeAnchors = [
            '<Link href="javascript:alert(1)" i18n="anchors.labelOnly" />',
            '<Link to="https://evil.example.com/issues/123" i18n="anchors.labelOnly" />',
        ];

        for (const anchor of unsafeAnchors) {
            const output = renderXmlToMarkup(parseXML(anchor), {
                setups: {},
                invalidate: async () => {},
                translations,
                values: {},
            });

            expect(output).toContain('Label only');
            expect(output).not.toContain('href=');
        }
    });
});
