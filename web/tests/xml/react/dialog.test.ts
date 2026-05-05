import { xmlToAST } from '@/xml/compiler';
import { render } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Dialog', () => {
    /* The compiler should preserve the dialog shell and its nested sections. */
    it('compiles dialog xml into dialog ast nodes', () => {
        expect(
            xmlToAST(
                '<Dialog><DialogHeader><DialogTitle>Title</DialogTitle><DialogDescription>Description</DialogDescription></DialogHeader><DialogFooter /></Dialog>'
            )
        ).toEqual([
            {
                name: 'Dialog',
                children: [
                    {
                        name: 'DialogHeader',
                        children: [
                            { name: 'DialogTitle', children: [{ name: 'Text', children: 'Title' }] },
                            { name: 'DialogDescription', children: [{ name: 'Text', children: 'Description' }] },
                        ],
                    },
                    { name: 'DialogFooter' },
                ],
            },
        ]);
    });

    /*
     * This integration test proves that raw XML containing dialog layout tags
     * is parsed and resolved through the runtime registry.
     */
    it('resolves dialog layout tags from xml', () => {
        const ctx: ExecutionContext = {};
        const ast = xmlToAST(
            '<Dialog><DialogHeader><DialogTitle>Title</DialogTitle><DialogDescription>Description</DialogDescription></DialogHeader><DialogFooter /></Dialog>'
        );
        const markup = renderToStaticMarkup(createElement('div', null, render(ast, ctx)));

        expect(markup).toContain('Title');
        expect(markup).toContain('Description');
    });
});
