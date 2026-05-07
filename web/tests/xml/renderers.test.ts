import { renderNode } from '@xml/core/node';
import { RenderXML } from '@xml/renderers.tsx';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('renderNode', () => {
    it('returns null for missing node input', () => {
        expect(renderNode(null, { values: {} })).toBeNull();
    });

    it('resolves text nodes from full expressions', () => {
        const ctx: ExecutionContext = { values: {}, count: 7 };
        expect(
            renderToStaticMarkup(
                createElement(
                    'div',
                    null,
                    createElement(RenderXML, { ast: [{ name: 'Text', children: '{`Count ${count}`}' }], ctx })
                )
            )
        ).toBe('<div>Count 7</div>');
    });

    it('skips nodes when if condition is false', () => {
        const ctx: ExecutionContext = { values: {} };
        const node: ASTNode = { name: 'Button', params: { if: '{false}' } };
        expect(renderToStaticMarkup(createElement('div', null, createElement(RenderXML, { ast: [node], ctx })))).toBe(
            '<div></div>'
        );
    });

    it('throws on unknown component', () => {
        const ctx: ExecutionContext = { values: {} };
        expect(() =>
            renderToStaticMarkup(
                createElement('div', null, createElement(RenderXML, { ast: [{ name: 'Unknown' }], ctx }))
            )
        ).toThrow('Unknown component "Unknown"');
    });

    it('resolves props from expressions', () => {
        const ctx: ExecutionContext = { values: {}, count: 2 };
        const node: ASTNode = { name: 'Input', params: { label: '{`Count: ${count}`}' } };
        expect(
            renderToStaticMarkup(createElement('div', null, createElement(RenderXML, { ast: [node], ctx })))
        ).toContain('Count: 2');
    });

    it('resolves input props from expressions', () => {
        const ctx: ExecutionContext = { values: {}, form: { value: 'Ada', placeholder: 'Enter name' } };
        const node: ASTNode = { name: 'Input', params: { value: 'form.value', placeholder: 'form.placeholder' } };
        const output = renderToStaticMarkup(createElement('div', null, createElement(RenderXML, { ast: [node], ctx })));
        expect(output).toContain('value="Ada"');
        expect(output).toContain('placeholder="Enter name"');
    });
});
