import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Hero', () => {
    /* The compiler should preserve Hero props so the runtime can build the header layout. */
    it('compiles hero xml into a hero ast node', () => {
        expect(xmlToAST('<Hero title="Overview" subtitle="Status at a glance" />')).toEqual([
            {
                name: 'Hero',
                params: {
                    title: 'Overview',
                    subtitle: 'Status at a glance',
                },
            },
        ]);
    });

    /*
     * This integration test proves that raw XML containing `<Hero>` is parsed,
     * resolved through the runtime registry, and emitted with the expected hero
     * layout structure.
     */
    it('renders title and subtitle content', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Hero title="Overview" subtitle="Status at a glance" />');
        const renderedTree = renderNode(ast, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<div class="flex items-start justify-between gap-4"><div class="flex items-center gap-3"><div><h2 class="text-lg font-semibold text-white">Overview</h2><p class="text-sm text-white/60">Status at a glance</p></div></div></div>'
        );
    });

    it('renders right-side children content', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Hero title="Overview"><Button variant="outline">Create</Button></Hero>');
        const renderedTree = renderNode(ast, ctx);
        const markup = renderToStaticMarkup(createElement(Fragment, null, renderedTree));

        expect(markup).toContain('<h2 class="text-lg font-semibold text-white">Overview</h2>');
        expect(markup).toContain('Create');
        expect(markup).toContain('shrink-0');
    });
});
