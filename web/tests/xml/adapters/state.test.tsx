import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ExecutionContext } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { parseXML } from '@/xml/core/parser';
import { RenderXML } from '@/xml/renderers.tsx';
import { ContextProvider, setupContext } from '@/xml/core/context';

describe('State', () => {
    /* State object fields should be visible to sibling nodes after initialization. */
    it('renders state values for sibling nodes', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        ctx.translations = { state: { value: '{{text}}' } };
        const ast = parseXML(
            '<longlink><State id="filter" value="day" /><P i18n="state.value" text="${filter.value}" /></longlink>'
        );
        await setupContext(ast, ctx, '');
        const renderedTree = createElement(ContextProvider, { value: ctx, children: renderNode(ast, ctx) });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toContain('day');
    });

    /* Multiple state attributes should seed a proxied object slot. */
    it('renders multi-field state values', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        ctx.translations = { state: { summary: '{{name}} {{score}} {{size}}' } };
        const ast = parseXML(
            '<longlink><State id="state1" value1="first value" score="10" list="[]" /><P i18n="state.summary" name="${state1.value1}" score="${state1.score}" size="${state1.list.length}" /></longlink>'
        );

        await setupContext(ast, ctx, '');
        const renderedTree = createElement(ContextProvider, { value: ctx, children: renderNode(ast, ctx) });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toContain('first value 10 0');
    });

    /* State nodes must render a scoped setup error when nested children are present. */
    it('renders an error when children are present', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<State id="filter" value="day"><P i18n="state.ready" /></State>');

        expect(renderToStaticMarkup(createElement(Fragment, null, createElement(RenderXML, { ast, ctx })))).toContain(
            'State cannot have children'
        );
    });

    /* Missing ids should render a clear scoped runtime error. */
    it('renders an error when id is missing', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<State value="x" />');

        expect(renderToStaticMarkup(createElement(Fragment, null, createElement(RenderXML, { ast, ctx })))).toContain(
            'State requires a string id'
        );
    });
});
