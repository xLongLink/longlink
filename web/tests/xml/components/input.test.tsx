import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('Input', () => {
    /* The compiler should preserve input attributes. */
    it('compiles input xml into an input ast node', () => {
        expect(xmlToAST('<Input label="Name" value="Ada" />')).toEqual([
            { name: 'Input', params: { label: 'Name', value: 'Ada' } },
        ]);
    });

    /* The runtime should render input XML into the expected markup. */
    it('renders raw xml input content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Input label="Name" value="Ada" />');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('Ada');
    });
});
