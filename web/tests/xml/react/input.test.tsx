import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Input', () => {
    /* The compiler should preserve input attributes as raw strings. */
    it('compiles input xml into an input ast node', () => {
        expect(parseXML('<Input value="user.name" placeholder="user.placeholder" />')).toEqual([
            {
                name: 'Input',
                params: { value: 'user.name', placeholder: 'user.placeholder' },
            },
        ]);
    });

    /* The runtime should render input XML into the expected markup. */
    it('renders raw xml input content end to end', () => {
        const ctx: ExecutionContext = { values: {}, user: { name: 'Ada' } };
        const ast = parseXML('<Input value="user.name" />');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('Ada');
    });
});
