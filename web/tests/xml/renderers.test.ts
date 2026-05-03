import { describe, expect, it } from 'bun:test';
import type { ComponentType } from 'react';
import { render, renderNode } from '../../src/xml/renderers';
import type { ASTNode, ExecutionContext, RegistryShape } from '../../src/xml/types';

describe('renderNode', () => {
    it('returns null for missing node input', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };

        expect(renderNode(null, {}, ctx)).toBeNull();
    });

    it('resolves text nodes from full expressions', () => {
        const ctx: ExecutionContext = {
            state: { count: [7, () => {}] },
            queries: {},
            scope: {},
        };

        expect(renderNode({ name: 'text', value: '{`Count ${count}`}' }, {}, ctx)).toBe('Count 7');
    });

    it('skips nodes when if condition is false', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const node: ASTNode = { name: 'Widget', params: { if: '{false}' } };

        expect(renderNode(node, { Widget: (() => null) as ComponentType<any> }, ctx)).toBeNull();
    });

    it('throws on unknown component', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };

        expect(() => renderNode({ name: 'Unknown' }, {}, ctx)).toThrow('Unknown component "Unknown"');
    });

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
});

describe('render', () => {
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
