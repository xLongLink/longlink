import { xmlToAST } from '@/xml/compiler';
import { registry } from '@/xml/registry';
import { renderNode } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Input', () => {
    /* The compiler should preserve input attributes. */
    it('compiles input xml into an input ast node', () => {
        expect(xmlToAST('<Input label="Name" bind:value="user.name" bind:placeholder="user.placeholder" />')).toEqual([
            {
                name: 'Input',
                params: { label: 'Name', 'bind:value': 'user.name', 'bind:placeholder': 'user.placeholder' },
            },
        ]);
    });

    /* The runtime should render input XML into the expected markup. */
    it('renders raw xml input content end to end', () => {
        const ctx: ExecutionContext = {
            state: { user: [{ name: 'Ada' }, () => {}] },
            queries: {},
            scope: {},
        };
        const ast = xmlToAST('<Input label="Name" bind:value="user.name" />');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('Ada');
    });
});
