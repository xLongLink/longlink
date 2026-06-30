import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('P', () => {
    /* The compiler should preserve the i18n attribute on paragraph tags. */
    it('compiles p xml into a paragraph ast node', () => {
        expect(parseXML('<P i18n="copy.paragraph" />')).toEqual([
            {
                name: 'P',
                params: { i18n: 'copy.paragraph' },
                children: [],
            },
        ]);
    });

    /* The runtime should resolve localized paragraph text from the bundle. */
    it('renders localized paragraph content end to end', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translations: { copy: { paragraph: 'Paragraph text' } },
            values: {},
        };
        const ast = parseXML('<P i18n="copy.paragraph" />');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<p class="leading-7">Paragraph text</p>'
        );
    });

    /* Direct value props should render dynamic text without requiring a translation key. */
    it('renders direct paragraph values', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: { item: { name: 'Widget' } } };
        const ast = parseXML('<P value="$item.name" />');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<p class="leading-7">Widget</p>'
        );
    });
});
