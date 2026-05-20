import { ContextProvider, setupContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('State', () => {
    /* The compiler should preserve state attributes for self-closing state nodes. */
    it('compiles state xml into a state ast node', () => {
        expect(parseXML('<State id="filter" value="day" />')).toEqual([
            {
                name: 'State',
                params: { id: 'filter', value: 'day' },
                children: [],
            },
        ]);
    });

    /* State object fields should be visible to sibling nodes after initialization. */
    it('renders state values for sibling nodes', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<longlink><State id="filter" value="day" /><P>${filter.value}</P></longlink>');
        await setupContext(ast, ctx, '');
        const renderedTree = createElement(ContextProvider, { value: ctx, children: renderNode(ast, ctx) });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<div class="flex flex-col gap-6 text-sm"><p class="leading-7">day</p></div>'
        );
    });

    /* Single value state declarations should expose array payloads on `.value`. */
    it('renders array state values through value', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML(
            '<longlink><State id="cart" value="[]" /><P>Cart size: ${cart.value.length}</P></longlink>'
        );

        await setupContext(ast, ctx, '');
        const renderedTree = createElement(ContextProvider, { value: ctx, children: renderNode(ast, ctx) });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<div class="flex flex-col gap-6 text-sm"><p class="leading-7">Cart size: 0</p></div>'
        );
    });

    /* Multiple state attributes should seed a proxied object slot. */
    it('renders multi-field state values', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML(
            '<longlink><State id="state1" value1="first value" score="10" list="[]" /><P>${state1.value1} ${state1.score} ${state1.list.length}</P></longlink>'
        );

        await setupContext(ast, ctx, '');
        const renderedTree = createElement(ContextProvider, { value: ctx, children: renderNode(ast, ctx) });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<div class="flex flex-col gap-6 text-sm"><p class="leading-7">first value 10 0</p></div>'
        );
    });

    /* State nodes must reject nested children so the runtime contract stays declarative. */
    it('throws when children are present', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<State id="filter" value="day"><P>Ready</P></State>');

        expect(() =>
            renderToStaticMarkup(createElement(Fragment, null, createElement(RenderXML, { ast, ctx })))
        ).toThrow('State cannot have children');
    });

    /* Missing ids should fail fast so XML authors get a clear runtime error. */
    it('throws when id is missing', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<State value="x" />');

        expect(() =>
            renderToStaticMarkup(createElement(Fragment, null, createElement(RenderXML, { ast, ctx })))
        ).toThrow('State requires a string id');
    });
});
