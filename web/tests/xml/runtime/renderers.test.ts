import { describe, expect, it } from 'vitest';
import type { ASTNode } from '@/xml/runtime/types';
import { createContext } from '@/xml/runtime/core/context';
import { compileProps, renderXmlToMarkup } from './helpers';

describe('renderNode', () => {
    it('skips nodes when if condition is false', () => {
        const node: ASTNode = { name: 'Button', params: compileProps({ if: '${false}' }), children: [] };
        expect(renderXmlToMarkup([node])).not.toContain('<button');
    });

    it('throws on unknown component', () => {
        expect(() => renderXmlToMarkup([{ name: 'Unknown', params: {}, children: [] }])).toThrow(
            'Unknown component "Unknown"'
        );
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

    it('renders Heading semantic props', () => {
        const output = renderXmlToMarkup([
            {
                name: 'Heading',
                params: compileProps({
                    id: 'orders-heading',
                    level: '1',
                }),
                children: [{ name: 'Text', params: compileProps({ value: 'Orders' }), children: [] }],
            },
        ]);

        expect(output).toContain('id="orders-heading"');
        expect(output).toContain('data-level="1"');
        expect(output).toContain('Orders');
    });
});
