// @vitest-environment happy-dom
import { act } from 'react';
import type { ASTNode } from '@/xml/types';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupMountedRoot, createContext, parseFragment, RenderXML, renderXmlToMarkup } from './helpers';

describe('renderNode', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        await cleanupMountedRoot(root);
        root = undefined;
        vi.restoreAllMocks();
    });

    it('skips nodes when if condition is false', () => {
        expect(renderXmlToMarkup(parseFragment('<Button if="${false}" />'))).not.toContain('<button');
    });

    it('throws on unknown component', () => {
        expect(() => renderXmlToMarkup([{ name: 'Unknown', params: {}, children: [] }])).toThrow(
            'Unknown component "Unknown"'
        );
    });

    it('recovers when the next XML document is valid', async () => {
        // Arrange
        const container = document.createElement('div');
        const context = createContext();
        const invalidAst: ASTNode = {
            name: 'longlink',
            params: {},
            children: [{ name: 'Unknown', params: {}, children: [] }],
        };
        const validAst: ASTNode = {
            name: 'longlink',
            params: {},
            children: parseFragment('<Heading level="1">Recovered</Heading>'),
        };
        root = createRoot(container);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        // Act
        try {
            await act(async () => root?.render(<RenderXML ast={invalidAst} ctx={context} />));
        } catch {
            // React test rendering reports the intentionally captured error to the caller.
        }
        await act(async () => root?.render(<RenderXML ast={validAst} ctx={context} />));

        // Assert
        expect(container.textContent).toContain('Recovered');
    });

    it('resolves input props from expressions', () => {
        const ctx = createContext();
        ctx.scope.bindings.form = { value: 'Ada' };
        const output = renderXmlToMarkup(parseFragment('<TextInput label="Name" value="form.value" />'), ctx);

        expect(output).toContain('value="Ada"');
    });

    it('renders Heading content', () => {
        // Arrange
        const output = renderXmlToMarkup(parseFragment('<Heading level="1">Orders</Heading>'));

        // Assert
        expect(output).toContain('<h1');
        expect(output).toContain('Orders');
    });

    it('rejects Heading levels outside the schema', () => {
        // Arrange
        const ast = parseFragment('<Heading level="7">Orders</Heading>');

        // Act and assert
        expect(() => renderXmlToMarkup(ast)).toThrow();
    });
});
