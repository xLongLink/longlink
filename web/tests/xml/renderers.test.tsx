// @vitest-environment happy-dom
import { act } from 'react';
import { RenderXML } from '@/xml';
import type { ASTNode } from '@/xml/types';
import { createRoot } from 'react-dom/client';
import { createContext } from '@/xml/core/context';
import { compileProps, renderXmlToMarkup } from './helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('renderNode', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        if (root) {
            await act(async () => root?.unmount());
        }
        root = undefined;
        vi.restoreAllMocks();
    });

    it('skips nodes when if condition is false', () => {
        const node: ASTNode = { name: 'Button', params: compileProps({ if: '${false}' }), children: [] };
        expect(renderXmlToMarkup([node])).not.toContain('<button');
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
            children: [
                {
                    name: 'Heading',
                    params: compileProps({ level: '1' }),
                    children: [{ name: '$text', params: compileProps({ value: 'Recovered' }), children: [] }],
                },
            ],
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
        const node: ASTNode = {
            name: 'TextInput',
            params: compileProps({ label: 'Name', value: 'form.value' }),
            children: [],
        };
        const output = renderXmlToMarkup([node], ctx);

        expect(output).toContain('value="Ada"');
    });

    it('renders Heading content', () => {
        const output = renderXmlToMarkup([
            {
                name: 'Heading',
                params: compileProps({ level: '1' }),
                children: [{ name: '$text', params: compileProps({ value: 'Orders' }), children: [] }],
            },
        ]);

        expect(output).toContain('Orders');
    });
});
