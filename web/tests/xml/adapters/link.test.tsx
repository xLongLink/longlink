import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';
import { createContext } from '@/xml/core/context';

describe('Link', () => {
    it('renders app navigation', () => {
        const navigationContext = createContext();
        navigationContext.services.navigationBaseUrl = '/orgs/acme/apps/tracker';
        const navigationOutput = renderXmlToMarkup(parseXML('<Link to="/issues/123">Issue</Link>'), navigationContext);

        expect(navigationOutput).toContain('href="/orgs/acme/apps/tracker/issues/123"');
    });

    it('drops unsafe expression-backed navigation targets and falls back to a safe href', () => {
        const context = createContext();
        context.scope.bindings = { destination: 'javascript:alert(1)', fallback: '/files/document.pdf' };
        context.services.navigationBaseUrl = '/orgs/acme/apps/tracker';
        context.services.requestBaseUrl = '/orgs/acme/apps/tracker';
        const output = renderXmlToMarkup(
            parseXML('<Link to="${destination}" href="${fallback}">Document</Link>'),
            context
        );

        expect(output).toContain('href="/orgs/acme/apps/tracker/files/document.pdf"');
    });
});
