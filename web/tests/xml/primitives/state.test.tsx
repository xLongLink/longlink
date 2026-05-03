import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { State } from '@/xml/primitives/State';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import { RuntimeProvider, useRuntime } from '@/xml/runtime';
import type { ExecutionContext, RuntimeState } from '@/xml/types';

function StateProbe() {
    /* Read the current runtime state so the test can assert registration. */
    const { ctx } = useRuntime();
    const [value] = ctx.state.filter;

    return createElement('span', null, String(value.value));
}

describe('State', () => {
    /* The compiler should preserve state attributes and child content. */
    it('compiles state xml into a state ast node', () => {
        expect(xmlToAST('<State id="filter" value="day"><p>Ready</p></State>')).toEqual([
            {
                name: 'State',
                params: { id: 'filter', value: 'day' },
                children: [{ name: 'p', children: [{ name: 'text', value: 'Ready' }] }],
            },
        ]);
    });

    /* The runtime should render state XML into the expected HTML output. */
    it('renders raw xml state content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<State id="filter" value="day"><p>{filter.value}</p></State>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<p class="leading-7 [&amp;:not(:first-child)]:mt-6">day</p>'
        );
    });

    /* State should register a scoped tuple and preserve its initial object shape. */
    it('exposes initial state to descendants', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const runtime: RuntimeState = { node: { name: 'root' }, ctx, registry: {} };

        const output = renderToStaticMarkup(
            createElement(RuntimeProvider, {
                value: runtime,
                children: createElement(State, { id: 'filter', value: 'day' }, createElement(StateProbe)),
            })
        );

        expect(output).toBe('<span>day</span>');
    });

    /* Missing ids should fail fast so XML authors get a clear runtime error. */
    it('throws when id is missing', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const runtime: RuntimeState = { node: { name: 'root' }, ctx, registry: {} };

        expect(() =>
            renderToStaticMarkup(
                createElement(RuntimeProvider, {
                    value: runtime,
                    children: createElement(State, null, 'x'),
                })
            )
        ).toThrow('State requires an "id" parameter');
    });
});
