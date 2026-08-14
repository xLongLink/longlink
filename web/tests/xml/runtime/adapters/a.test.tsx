import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/runtime/core/parser';
import { createContext } from '@/xml/runtime/core/context';
import { renderXmlToMarkup } from '../helpers';

describe('Link', () => {
    /* App navigation targets should resolve against the view route base, not the API request base. */
    it('renders app navigation and internal anchors', () => {
        const navigationContext = createContext();
        navigationContext.services.navigationBaseUrl = '/orgs/acme/apps/tracker';
        const navigationOutput = renderXmlToMarkup(
            parseXML('<Link to="/issues/123"><Text value="Issue" /></Link>'),
            navigationContext,
            '/api/applications/app-1/proxy'
        );
        const anchorOutput = renderXmlToMarkup(
            parseXML('<Link href="/files/document.pdf"><Text value="Document" /></Link>'),
            createContext(),
            '/orgs/acme/apps/inventory'
        );

        expect(navigationOutput).toContain('href="/orgs/acme/apps/tracker/issues/123"');
        expect(anchorOutput).toContain('href="/orgs/acme/apps/inventory/files/document.pdf"');
    });

    it('drops unsafe expression-backed navigation targets and falls back to a safe href', () => {
        const context = createContext();
        context.scope.bindings = { destination: 'javascript:alert(1)', fallback: '/files/document.pdf' };
        context.services.navigationBaseUrl = '/orgs/acme/apps/tracker';
        const output = renderXmlToMarkup(
            parseXML('<Link to="${destination}" href="${fallback}"><Text value="Document" /></Link>'),
            context,
            '/orgs/acme/apps/tracker'
        );

        expect(output).toContain('href="/orgs/acme/apps/tracker/files/document.pdf"');
    });
});
