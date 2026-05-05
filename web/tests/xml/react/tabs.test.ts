import { xmlToAST } from '@/xml/compiler';
import { render } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Tabs', () => {
    /* The compiler should preserve the tabs shell and trigger/content structure. */
    it('compiles tabs xml into tabs ast nodes', () => {
        expect(
            xmlToAST(
                '<Tabs><TabsList><TabsTrigger value="one">One</TabsTrigger></TabsList><TabsContent value="one">Panel</TabsContent></Tabs>'
            )
        ).toEqual([
            {
                name: 'Tabs',
                children: [
                    {
                        name: 'TabsList',
                        children: [
                            {
                                name: 'TabsTrigger',
                                params: { value: 'one' },
                                children: [{ name: 'Text', children: 'One' }],
                            },
                        ],
                    },
                    {
                        name: 'TabsContent',
                        params: { value: 'one' },
                        children: [{ name: 'Text', children: 'Panel' }],
                    },
                ],
            },
        ]);
    });

    /*
     * This integration test proves that raw XML containing tabs layout tags is
     * parsed and resolved through the runtime registry.
     */
    it('resolves tabs layout tags from xml', () => {
        const ctx: ExecutionContext = {};
        const ast = xmlToAST(
            '<Tabs><TabsList><TabsTrigger value="one">One</TabsTrigger></TabsList><TabsContent value="one">Panel</TabsContent></Tabs>'
        );
        const markup = renderToStaticMarkup(createElement('div', null, render(ast, ctx)));

        expect(markup).toContain('One');
        expect(markup).toContain('data-slot="tabs"');
    });
});
