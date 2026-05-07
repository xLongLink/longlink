import { render, renderXml } from '@xml/renderers';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('renderXml', () => {
    /* Null input should short-circuit before any registry lookup. */
    it('returns null for missing node input', () => {
        expect(renderXml(null)).toBeNull();
    });

    /* Text nodes should evaluate expressions against the current runtime context. */
    it('resolves text nodes from full expressions', () => {
        const ctx: ExecutionContext = { count: 7 };

        expect(
            renderToStaticMarkup(
                createElement('div', null, render([{ name: 'Text', children: '{`Count ${count}`}' }], ctx, ''))
            )
        ).toBe('<div>Count 7</div>');
    });

    /* Conditional nodes should disappear when the condition resolves to false. */
    it('skips nodes when if condition is false', () => {
        const ctx: ExecutionContext = {};
        const node: ASTNode = { name: 'Button', params: { if: '{false}' } };

        expect(renderToStaticMarkup(createElement('div', null, render([node], ctx, '')))).toBe('<div></div>');
    });

    /* Unknown tags should fail loudly so missing registry entries are obvious. */
    it('throws on unknown component', () => {
        const ctx: ExecutionContext = {};

        expect(() => renderToStaticMarkup(createElement('div', null, render([{ name: 'Unknown' }], ctx, '')))).toThrow(
            'Unknown component "Unknown"'
        );
    });

    /* Prop expressions should flow through the rendered component. */
    it('resolves props from expressions', () => {
        const ctx: ExecutionContext = { count: 2 };

        const node: ASTNode = {
            name: 'Input',
            params: {
                label: '{`Count: ${count}`}',
            },
        };

        expect(renderToStaticMarkup(createElement('div', null, render([node], ctx, '')))).toContain('Count: 2');
    });

    /* Input props should flow through as plain evaluated values. */
    it('resolves input props from expressions', () => {
        const ctx: ExecutionContext = { form: { value: 'Ada', placeholder: 'Enter name' } };

        const node: ASTNode = {
            name: 'Input',
            params: {
                value: 'form.value',
                placeholder: 'form.placeholder',
            },
        };

        const output = renderToStaticMarkup(createElement('div', null, render([node], ctx, '')));

        expect(output).toContain('value="Ada"');
        expect(output).toContain('placeholder="Enter name"');
    });
});

describe('render', () => {
    /* Multiple root nodes should render independently in order. */
    it('renders each root node wrapped as fragments', () => {
        const ctx: ExecutionContext = {};
        const output = render(
            [
                { name: 'Text', children: 'a' },
                { name: 'Text', children: 'b' },
            ],
            ctx
        );

        expect(renderToStaticMarkup(createElement('div', null, output))).toBe('<div>ab</div>');
    });
});
