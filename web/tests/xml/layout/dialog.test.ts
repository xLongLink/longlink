import { describe, expect, it } from 'bun:test';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

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
                            { name: 'DialogTitle', children: [{ name: 'text', value: 'Title' }] },
                            { name: 'DialogDescription', children: [{ name: 'text', value: 'Description' }] },
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
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST(
            '<Dialog><DialogHeader><DialogTitle>Title</DialogTitle><DialogDescription>Description</DialogDescription></DialogHeader><DialogFooter /></Dialog>'
        );
        const renderedTree = renderNode(ast, registry, ctx) as any[];

        expect(renderedTree[0].props.children.props.children.type).toBe(registry.Dialog);
        expect(renderedTree[0].props.children.props.children.props.children.type.name).toBe('RuntimeChildren');
    });
});
