import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('State', () => {
    /* The compiler should preserve state attributes and child content. */
    it('compiles state xml into a state ast node', () => {
        expect(parseXML('<State id="filter" value="day"><p>Ready</p></State>')).toEqual([
            {
                name: 'State',
                params: { id: 'filter', value: 'day' },
                children: [{ name: 'p', children: [{ name: 'Text', children: 'Ready' }] }],
            },
        ]);
    });

    /* The runtime should render state XML into the expected HTML output. */
    it('renders raw xml state content end to end', () => {
        const ctx: ExecutionContext = { values: {} };
        const ast = parseXML('<State id="filter" value="day"><p>{filter}</p></State>');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<p class="leading-7 [&amp;:not(:first-child)]:mt-6">day</p>'
        );
    });

    /* State should register a scoped tuple and preserve its initial object shape. */
    it('exposes initial state to descendants', () => {
        const ctx: ExecutionContext = { values: {} };
        const ast = parseXML('<State id="filter" value="day">{filter}</State>');

        const output = renderToStaticMarkup(createElement(Fragment, null, createElement(RenderXML, { ast, ctx })));

        expect(output).toBe('day');
    });

    /* Missing ids should fail fast so XML authors get a clear runtime error. */
    it('throws when id is missing', () => {
        const ctx: ExecutionContext = { values: {} };
        const ast = parseXML('<State value="x">x</State>');

        expect(() =>
            renderToStaticMarkup(createElement(Fragment, null, createElement(RenderXML, { ast, ctx })))
        ).toThrow('State requires a string id');
    });
});
