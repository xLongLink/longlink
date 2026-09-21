import type { ASTNode } from '@/xml/types';
import type { ReactNode, Ref } from 'react';
import type { XmlRuntime } from '@/xml/types';
import { describe, expect, it } from 'vitest';
import { LinkProvider } from '@astryxdesign/core/Link';
import { renderToStaticMarkup } from 'react-dom/server';
import { createContext, parseFragment, RenderXML, renderXmlToMarkup } from '../helpers';

/** Records links that would navigate through the SPA router. */
function RouterStub({
    children,
    href,
    ref,
    to,
}: {
    children?: ReactNode;
    href?: string;
    ref?: Ref<HTMLSpanElement>;
    to?: string;
}) {
    return (
        <span ref={ref} data-router-link={href ?? to}>
            {children}
        </span>
    );
}

/** Renders XML with a router-aware link provider like the production app. */
function renderWithRouter(ast: ASTNode[], ctx: XmlRuntime): string {
    return renderToStaticMarkup(
        <LinkProvider component={RouterStub}>
            <RenderXML ast={{ name: 'longlink', params: {}, children: ast }} ctx={ctx} />
        </LinkProvider>
    );
}

describe('Link', () => {
    it('keeps solution navigation on the SPA router when a provider is present', () => {
        // Arrange
        const context = createContext({
            navigationBaseUrl: '/orgs/acme/solutions/tracker',
            requestBaseUrl: '/api/v1/solutions/tracker/proxy',
        });

        // Act
        const output = renderWithRouter(parseFragment('<Link to="/issues/123">Issue</Link>'), context);

        // Assert
        expect(output).toContain('data-router-link="/orgs/acme/solutions/tracker/issues/123"');
    });

    it('renders file links as native anchors that bypass the SPA router', () => {
        // Arrange
        const context = createContext({
            navigationBaseUrl: '/orgs/acme/solutions/tracker',
            requestBaseUrl: '/api/v1/solutions/tracker/proxy',
        });

        // Act
        const output = renderWithRouter(
            parseFragment('<Link href="/api/items/1/attachments/report.pdf">Report</Link>'),
            context
        );

        // Assert
        expect(output).not.toContain('data-router-link');
        expect(output).toContain('<a ');
        expect(output).toContain('href="/api/v1/solutions/tracker/proxy/api/items/1/attachments/report.pdf"');
    });

    it('drops unsafe expression-backed navigation targets and falls back to a safe href', () => {
        // Arrange
        const context = createContext({
            navigationBaseUrl: '/orgs/acme/solutions/tracker',
            requestBaseUrl: '/api/v1/solutions/tracker/proxy',
        });
        Object.assign(context.scope.bindings, { destination: 'javascript:alert(1)', fallback: '/files/document.pdf' });

        // Act
        const output = renderXmlToMarkup(
            parseFragment('<Link to="${destination}" href="${fallback}">Document</Link>'),
            context
        );

        // Assert
        expect(output).toContain('href="/api/v1/solutions/tracker/proxy/files/document.pdf"');
    });
});
