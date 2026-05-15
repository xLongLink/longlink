import { renderNode } from '@xml/core/node';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('renderNode', () => {
    it('returns null for missing node input', () => {
        expect(renderNode(null, { setups: {}, invalidate: async () => {}, values: {} })).toBeNull();
    });

    it('renders plain text nodes', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const node: ASTNode = { name: 'Text', params: { value: 'Hello' } };

        expect(renderToStaticMarkup(createElement('div', null, renderNode(node, ctx)))).toBe('<div>Hello</div>');
    });
});
