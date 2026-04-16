import { describe, it, expect } from 'bun:test';
import { screen } from '@testing-library/react';
import { For } from '../../src/primitives/For';
import { useRuntime } from '../../src/runtime';
import { makeCtx, renderWithRuntime } from './helpers';

/** Reads a scope variable from the current runtime context and renders it as text. */
function ScopeValue({ name }: { name: string }) {
    const { ctx } = useRuntime();
    return <span>{String(ctx.scope[name] ?? '')}</span>;
}

describe('For', () => {
    it('throws when "each" prop is missing', () => {
        expect(() => {
            renderWithRuntime(<For as="item" />);
        }).toThrow('For requires an "each" parameter');
    });

    it('throws when "as" prop is missing', () => {
        expect(() => {
            renderWithRuntime(<For each="items" />, makeCtx({}, {}, { items: [1] }));
        }).toThrow('For requires an "as" parameter');
    });

    it('renders one child block per item in the array', () => {
        const ctx = makeCtx({}, {}, { fruits: ['apple', 'banana', 'cherry'] });
        renderWithRuntime(
            <For each="fruits" as="fruit">
                <ScopeValue name="fruit" />
            </For>,
            ctx
        );
        expect(screen.getByText('apple')).toBeTruthy();
        expect(screen.getByText('banana')).toBeTruthy();
        expect(screen.getByText('cherry')).toBeTruthy();
    });

    it('injects the item into scope under the "as" name', () => {
        const ctx = makeCtx({}, {}, { letters: ['X'] });
        renderWithRuntime(
            <For each="letters" as="letter">
                <ScopeValue name="letter" />
            </For>,
            ctx
        );
        expect(screen.getByText('X')).toBeTruthy();
    });

    it('injects $index into scope for each iteration', () => {
        const ctx = makeCtx({}, {}, { items: ['a', 'b', 'c'] });
        renderWithRuntime(
            <For each="items" as="item">
                <ScopeValue name="$index" />
            </For>,
            ctx
        );
        // Indices 0, 1, 2 should all be rendered
        expect(screen.getByText('0')).toBeTruthy();
        expect(screen.getByText('1')).toBeTruthy();
        expect(screen.getByText('2')).toBeTruthy();
    });

    it('renders nothing when the array is empty', () => {
        const ctx = makeCtx({}, {}, { items: [] });
        const { container } = renderWithRuntime(
            <For each="items" as="item">
                <span>should not appear</span>
            </For>,
            ctx
        );
        expect(container.querySelectorAll('span')).toHaveLength(0);
    });

    it('returns null when "each" evaluates to a non-array', () => {
        // A non-array value (e.g. a number) should produce no output without throwing
        const ctx = makeCtx({}, {}, { count: 5 });
        const { container } = renderWithRuntime(
            <For each="count" as="item">
                <span>item</span>
            </For>,
            ctx
        );
        expect(container.querySelectorAll('span')).toHaveLength(0);
    });

    it('reads the iterated array from state', () => {
        // "each" is evaluated against the full context, including state
        const ctx = makeCtx({ tags: ['foo', 'bar'] });
        renderWithRuntime(
            <For each="tags" as="tag">
                <ScopeValue name="tag" />
            </For>,
            ctx
        );
        expect(screen.getByText('foo')).toBeTruthy();
        expect(screen.getByText('bar')).toBeTruthy();
    });
});
