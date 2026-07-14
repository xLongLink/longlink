import { describe, expect, it } from 'bun:test';
import { parseXML } from '@/xml/core/parser';
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

    it('renders intended external anchors', () => {
        const httpsOutput = renderXmlToMarkup(
            parseXML('<A href="https://docs.example.com/issues/123" i18n="anchors.labelOnly" />'),
            { setups: {}, invalidate: async () => {}, values: {} }
        );
        const mailtoOutput = renderXmlToMarkup(
            parseXML('<A href="mailto:help@example.com" i18n="anchors.labelOnly" />'),
            { setups: {}, invalidate: async () => {}, values: {} }
        );

        expect(httpsOutput).toContain('href="https://docs.example.com/issues/123"');
        expect(mailtoOutput).toContain('href="mailto:help@example.com"');
    });

    it('omits href from unsafe anchors', () => {
        const unsafeAnchors = [
            '<A href="javascript:alert(1)" i18n="anchors.labelOnly" />',
            '<A href="data:text/html,unsafe" i18n="anchors.labelOnly" />',
            '<A href="//evil.example.com/issues/123" i18n="anchors.labelOnly" />',
            '<A href="\\evil.example.com/issues/123" i18n="anchors.labelOnly" />',
            '<A href="/\\evil.example.com/issues/123" i18n="anchors.labelOnly" />',
            '<A href="https:\\evil.example.com/issues/123" i18n="anchors.labelOnly" />',
            '<A to="https://evil.example.com/issues/123" i18n="anchors.labelOnly" />',
        ];

        for (const anchor of unsafeAnchors) {
            const output = renderXmlToMarkup(parseXML(anchor), {
                setups: {},
                invalidate: async () => {},
                values: {},
            });

            expect(output).toContain('>Label only</a>');
            expect(output).not.toContain('href=');
        }
    });
});
