import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/v1/core/parser';
import { renderXmlToMarkup } from '../helpers';

const translations = {
    'anchors.download': { defaultMessage: 'Download' },
    'anchors.openIssue': { defaultMessage: 'Open issue' },
};

describe('Link', () => {
    /* App navigation targets should resolve against the view route base, not the API request base. */
    it('renders app navigation and internal anchors', () => {
        const navigationOutput = renderXmlToMarkup(
            parseXML('<Link to="/issues/123" i18n="anchors.openIssue" />'),
            {
                scope: { bindings: {} },
                services: {
                    invalidate: async () => {},
                    navigationBaseUrl: '/orgs/acme/apps/tracker',
                    requestBaseUrl: '',
                    setups: {},
                    translations,
                },
            },
            '/api/applications/app-1/proxy'
        );
        const anchorOutput = renderXmlToMarkup(
            parseXML('<Link href="/files/document.pdf" i18n="anchors.download" />'),
            {
                scope: { bindings: {} },
                services: {
                    invalidate: async () => {},
                    navigationBaseUrl: '',
                    requestBaseUrl: '',
                    setups: {},
                    translations,
                },
            },
            '/orgs/acme/apps/inventory'
        );

        expect(navigationOutput).toContain('href="/orgs/acme/apps/tracker/issues/123"');
        expect(navigationOutput).toContain('Open issue');
        expect(anchorOutput).toContain('href="/orgs/acme/apps/inventory/files/document.pdf"');
    });
});
