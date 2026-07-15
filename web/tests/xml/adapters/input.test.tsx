import { proxy } from 'valtio';
import { createElement } from 'react';
import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ExecutionContext } from '@/xml/types';
import { parseXML } from '@/xml/core/parser';
import { RenderXML } from '@/xml/renderers.tsx';

describe('Input', () => {
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
