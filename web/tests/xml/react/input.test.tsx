import { xmlToAST } from '@/xml/compiler';
import { render } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Input', () => {
    /* The compiler should preserve the minimal input attributes. */
    it('compiles input xml into an input ast node', () => {
        expect(xmlToAST('<Input value="$user.name" placeholder="$user.placeholder" />')).toEqual([
            {
                name: 'Input',
                params: { value: '$user.name', placeholder: '$user.placeholder' },
            },
        ]);
    });

    /* The runtime should render input XML into the expected markup. */
    it('renders raw xml input content end to end', () => {
        const ctx: ExecutionContext = { user: { name: 'Ada' } };
        const ast = xmlToAST('<Input value="$user.name" />');
        const renderedTree = render(ast, ctx, '');

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('Ada');
    });
});
