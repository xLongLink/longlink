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
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('skips nodes when if condition is false', () => {
        expect(renderXmlToMarkup(parseFragment('<Button if="${false}" />'))).toBe(renderXmlToMarkup([]));
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
        await expect(act(async () => root?.render(<RenderXML ast={invalidAst} ctx={context} />))).rejects.toThrow(
            'Unknown component "Unknown"'
        );

        // Render a new document after confirming the previous document failed.
        await act(async () => root?.render(<RenderXML ast={validAst} ctx={context} />));

        // Assert
        expect(container.querySelector('h1')?.textContent).toContain('Recovered');
    });

    it('resolves input props from expressions', () => {
        const ctx = createContext();
        ctx.scope.bindings.form = { value: 'Ada' };
        const output = renderXmlToMarkup(parseFragment('<TextInput label="Name" value="form.value" />'), ctx);

        expect(output).toContain('value="Ada"');
    });

    it('rejects Heading levels outside the schema', () => {
        // Arrange
        const ast = parseFragment('<Heading level="7">Orders</Heading>');

        // Act and assert
        expect(() => renderXmlToMarkup(ast)).toThrow('Invalid XML props: level:');
    });
});
