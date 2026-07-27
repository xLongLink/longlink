import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { proxy } from 'valtio';
import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/core/parser';
import { RenderXML } from '@/xml/renderers.tsx';
import type { ExecutionContext } from '@/xml/types';

describe('FileInput', () => {
    /* File inputs cannot be controlled with a value attribute in React. */
    it('renders bound file input without a controlled value', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {
                document: proxy({ file: null }),
            },
        };
        const ast = parseXML('<FileInput label="Document" accept=".pdf" value="$document.file" />');
        const renderedTree = createElement(RenderXML, { ast, ctx });
        const output = renderToStaticMarkup(createElement('div', null, renderedTree));

        expect(output).toContain('type="file"');
        expect(output).toContain('accept=".pdf"');
        expect(output).not.toContain('value=');
    });
});
