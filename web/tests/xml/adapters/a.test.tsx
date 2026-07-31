import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/core/parser';
import { renderXmlToMarkup } from '../helpers';

const translations = {
    'anchors.download': { defaultMessage: 'Download' },
    'anchors.labelOnly': { defaultMessage: 'Label only' },
    'anchors.openIssue': { defaultMessage: 'Open issue' },
};

describe('Link', () => {
    /* App navigation targets should resolve against the view route base, not the API request base. */
    it('renders app navigation and internal anchors', () => {
        const navigationOutput = renderXmlToMarkup(
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
        const anchorOutput = renderXmlToMarkup(
            parseXML('<Link href="/files/document.pdf" i18n="anchors.download" />'),
            { setups: {}, invalidate: async () => {}, translations, values: {} },
            '/orgs/acme/apps/inventory'
        );

        expect(navigationOutput).toContain('href="/orgs/acme/apps/tracker/issues/123"');
        expect(navigationOutput).toContain('Open issue');
        expect(anchorOutput).toContain('href="/orgs/acme/apps/inventory/files/document.pdf"');
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
