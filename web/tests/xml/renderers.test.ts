import { describe, expect, it } from 'bun:test';
import { render, renderNode } from '../../src/xml/renderers';
import type { ASTNode, ExecutionContext } from '../../src/xml/types';

describe('renderNode', () => {
    /* Null input should short-circuit before any registry lookup. */
    it('returns null for missing node input', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };

        expect(renderNode(null, ctx)).toBeNull();
    });

    /* Text nodes should evaluate expressions against the current runtime context. */
    it('resolves text nodes from full expressions', () => {
        const ctx: ExecutionContext = {
            state: { count: [7, () => {}] },
            queries: {},
            scope: {},
        };

        expect(renderNode({ name: 'text', value: '{`Count ${count}`}' }, ctx)).toBe('Count 7');
    });

    /* Conditional nodes should disappear when the condition resolves to false. */
    it('skips nodes when if condition is false', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const node: ASTNode = { name: 'Widget', params: { if: '{false}' } };

        expect(renderNode(node, ctx)).toBeNull();
    });

    /* Unknown tags should fail loudly so missing registry entries are obvious. */
    it('throws on unknown component', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };

        expect(() => renderNode({ name: 'Unknown' }, ctx)).toThrow('Unknown component "Unknown"');
    });

    /* Prop expressions should flow through the rendered component. */
    it('resolves props from expressions', () => {
        const ctx: ExecutionContext = {
            state: { count: [2, () => {}] },
            queries: {},
            scope: {},
        };

        const node: ASTNode = {
            name: 'Widget',
            params: {
                label: '{`Count: ${count}`}',
            },
        };

        const runtimeProviderElement = renderNode(node, ctx) as any;
        const widgetElement = runtimeProviderElement.props.children;

        expect(widgetElement.props.label).toBe('Count: 2');
    });

    /* $-bound props should provide the bound value and a matching prop change callback. */
    it('resolves $ props into values and change handlers', () => {
        let latestValue: unknown;
        const currentValue = { value: 'Ada', placeholder: 'Enter name' };
        const ctx: ExecutionContext = {
            state: {
                form: [
                    currentValue,
                    (value: unknown) => {
                        latestValue =
                            typeof value === 'function' ? (value as (prev: unknown) => unknown)(currentValue) : value;
                    },
                ],
            },
            queries: {},
            scope: {},
        };

        const node: ASTNode = {
            name: 'Input',
            params: {
                value: '$form.value',
                placeholder: '$form.placeholder',
            },
        };

        const runtimeProviderElement = renderNode(node, ctx) as any;
        const widgetElement = runtimeProviderElement.props.children;

        expect(widgetElement.props.value).toBe('Ada');
        expect(widgetElement.props.placeholder).toBe('Enter name');

        widgetElement.props.onValueChange('Grace');

        expect(latestValue).toEqual({ value: 'Grace', placeholder: 'Enter name' });
    });
});

describe('render', () => {
    /* Multiple root nodes should render independently in order. */
    it('renders each root node wrapped as fragments', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const output = render(
            [
                { name: 'text', value: 'a' },
                { name: 'text', value: 'b' },
            ],
            ctx
        ) as any[];

        expect(Array.isArray(output)).toBe(true);
        expect(output).toHaveLength(2);
    });
});
