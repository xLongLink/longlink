import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Longlink', () => {
    /* The compiler should turn a raw <longlink> element into a root AST node. */
    it('compiles xml into a root ast node', () => {
        expect(parseXML('<longlink />')).toEqual([
            {
                name: 'longlink',
                children: [],
            },
        ]);
    });

    /*
     * This integration test proves that raw XML containing `<longlink>` is parsed,
     * resolved through the runtime registry, and emitted as the expected page
     * container markup.
     */
    it('renders raw xml content end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<longlink />');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<div class="flex flex-col gap-6 text-sm"></div>'
        );
    });
});
