import { describe, expect, it } from 'vitest';
import { createContext, parseFragment, renderXmlToMarkup } from '../helpers';

describe('Link', () => {
    it('renders solution navigation', () => {
        const navigationContext = createContext({ navigationBaseUrl: '/orgs/acme/solutions/tracker' });
        const navigationOutput = renderXmlToMarkup(
            parseFragment('<Link to="/issues/123">Issue</Link>'),
            navigationContext
        );

        expect(navigationOutput).toContain('href="/orgs/acme/solutions/tracker/issues/123"');
    });

    it('drops unsafe expression-backed navigation targets and falls back to a safe href', () => {
        // Arrange
        const context = createContext({
            navigationBaseUrl: '/orgs/acme/solutions/tracker',
            requestBaseUrl: '/api/v1/solutions/tracker/proxy',
        });
        context.scope.bindings = { destination: 'javascript:alert(1)', fallback: '/files/document.pdf' };

        // Act
        const output = renderXmlToMarkup(
            parseFragment('<Link to="${destination}" href="${fallback}">Document</Link>'),
            context
        );

        // Assert
        expect(output).toContain('href="/api/v1/solutions/tracker/proxy/files/document.pdf"');
    });
});
