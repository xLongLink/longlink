import { describe, expect, it } from 'bun:test';
import type { ComponentType } from 'react';
import { render, renderNode } from '../../src/xml/renderers';
import type { ASTNode, ExecutionContext, RegistryShape } from '../../src/xml/types';

describe('renderNode', () => {
    /* Null input should short-circuit before any registry lookup. */
    it('returns null for missing node input', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };

        expect(renderNode(null, {}, ctx)).toBeNull();
    });

    /* Text nodes should evaluate expressions against the current runtime context. */
    it('resolves text nodes from full expressions', () => {
        const ctx: ExecutionContext = {
            state: { count: [7, () => {}] },
            queries: {},
            scope: {},
        };

        expect(renderNode({ name: 'text', value: '{`Count ${count}`}' }, {}, ctx)).toBe('Count 7');
    });

    /* Conditional nodes should disappear when the condition resolves to false. */
    it('skips nodes when if condition is false', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const node: ASTNode = { name: 'Widget', params: { if: '{false}' } };

        expect(renderNode(node, { Widget: (() => null) as ComponentType<any> }, ctx)).toBeNull();
    });

    /* Unknown tags should fail loudly so missing registry entries are obvious. */
    it('throws on unknown component', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };

        expect(() => renderNode({ name: 'Unknown' }, {}, ctx)).toThrow('Unknown component "Unknown"');
    });

    /* Prop expressions and set: handlers should both flow through the rendered component. */
    it('resolves props and composes multiple set handlers into one onClick', () => {
        let latestValue: unknown;
        let currentValue = { range: { from: 1, to: 2 }, mode: 'day' };
        const ctx: ExecutionContext = {
            state: {
                filter: [
                    currentValue,
                    (value: unknown) => {
                        latestValue =
                            typeof value === 'function' ? (value as (prev: unknown) => unknown)(currentValue) : value;
                        currentValue = latestValue as typeof currentValue;
                    },
                ],
                count: [2, () => {}],
            },
            queries: {},
            scope: {},
        };

        const registry: RegistryShape = {
            Widget: (() => null) as ComponentType<any>,
        };

        const node: ASTNode = {
            name: 'Widget',
            params: {
                label: '{`Count: ${count}`}',
                'set:filter.range.to': '3',
                'set:filter.mode': "'week'",
            },
        };

        const runtimeProviderElement = renderNode(node, registry, ctx) as any;
        const widgetElement = runtimeProviderElement.props.children;

        expect(widgetElement.props.label).toBe('Count: 2');

        widgetElement.props.onClick();

        expect(latestValue).toEqual({ range: { from: 1, to: 3 }, mode: 'week' });
    });

    /* bind:<prop> should provide the bound value and a matching prop change callback. */
    it('resolves bind props into values and change handlers', () => {
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

        const registry: RegistryShape = {
            Widget: (() => null) as ComponentType<any>,
        };

        const node: ASTNode = {
            name: 'Widget',
            params: {
                'bind:value': 'form.value',
                'bind:placeholder': 'form.placeholder',
            },
        };

        const runtimeProviderElement = renderNode(node, registry, ctx) as any;
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
        const registry: RegistryShape = {
            Widget: (() => null) as ComponentType<any>,
        };

        const output = render([{ name: 'Widget' }, { name: 'Widget' }], registry, ctx) as any[];

        expect(Array.isArray(output)).toBe(true);
        expect(output).toHaveLength(2);
    });
});
