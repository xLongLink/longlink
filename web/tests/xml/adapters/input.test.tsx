import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { proxy } from 'valtio';

describe('Input', () => {
    /* The runtime should render input XML into the expected markup. */
    it('renders raw xml input content end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {}, user: { name: 'Ada' } };
        const ast = parseXML('<Input value="user.name" />');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('Ada');
    });

    /* File inputs cannot be controlled with a value attribute in React. */
    it('renders bound file input without a controlled value', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {
                document: proxy({ file: null }),
            },
        };
        const ast = parseXML('<Input type="file" accept=".pdf" value="$document.file" />');
        const renderedTree = createElement(RenderXML, { ast, ctx });
        const output = renderToStaticMarkup(createElement('div', null, renderedTree));

        expect(output).toContain('type="file"');
        expect(output).toContain('accept=".pdf"');
        expect(output).not.toContain('value=');
    });
});
