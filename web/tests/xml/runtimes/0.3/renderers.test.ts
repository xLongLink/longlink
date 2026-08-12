import { describe, expect, it } from 'vitest';
import { createContext } from '@/xml/runtimes/0.3/core/context';
import type { ASTNode } from '@/xml/runtimes/0.3/types';
import { compileProps, renderXmlToMarkup } from './helpers';

describe('renderNode', () => {
    it('skips nodes when if condition is false', () => {
        const node: ASTNode = { name: 'Button', params: compileProps({ if: '${false}' }), children: [] };
        expect(renderXmlToMarkup([node])).not.toContain('<button');
    });

    it('throws on unknown component', () => {
        expect(() => renderXmlToMarkup([{ name: 'Unknown', children: [] }])).toThrow('Unknown component "Unknown"');
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
});
