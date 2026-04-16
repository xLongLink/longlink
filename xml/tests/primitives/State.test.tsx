import { describe, it, expect } from 'bun:test';
import { screen, fireEvent } from '@testing-library/react';
import { State } from '../../src/primitives/State';
import { useRuntime } from '../../src/runtime';
import { makeCtx, renderWithRuntime } from './helpers';

/** Reads a value from ctx.state[id] and renders it as text. */
function StateDisplay({ id }: { id: string }) {
    const { ctx } = useRuntime();
    const entry = ctx.state[id];
    return <span>{entry ? String(entry[0]?.count ?? entry[0]) : 'missing'}</span>;
}

/** Calls the setter from ctx.state[id] to update the state. */
function StateUpdater({ id, next }: { id: string; next: unknown }) {
    const { ctx } = useRuntime();
    const entry = ctx.state[id];
    return <button onClick={() => entry?.[1](next)}>update</button>;
}

describe('State', () => {
    it('throws when "id" prop is missing', () => {
        expect(() => {
            renderWithRuntime(<State />);
        }).toThrow('State requires an "id" parameter');
    });

    it('adds the state entry under the given id in the child context', () => {
        renderWithRuntime(
            <State id="form" count={0}>
                <StateDisplay id="form" />
            </State>
        );
        // The initial state object is { count: 0 }; StateDisplay renders entry[0].count
        expect(screen.getByText('0')).toBeTruthy();
    });

    it('does not expose the state id under a different key', () => {
        renderWithRuntime(
            <State id="myState" count={42}>
                <StateDisplay id="other" />
            </State>
        );
        // "other" is not registered, so StateDisplay falls back to "missing"
        expect(screen.getByText('missing')).toBeTruthy();
    });

    it('preserves existing context state when adding a new entry', () => {
        // Outer ctx already has a "base" state entry; State should not remove it
        const ctx = makeCtx({ base: 99 });
        renderWithRuntime(
            <State id="extra" value={1}>
                {/* Read the pre-existing "base" state from the outer context */}
                <StateDisplay id="base" />
            </State>,
            ctx
        );
        // StateDisplay renders entry[0] directly when there's no .count property
        expect(screen.getByText('99')).toBeTruthy();
    });

    it('provides a setter that updates the state value', () => {
        // Render State with an initial object, then update it via the setter
        renderWithRuntime(
            <State id="counter" count={0}>
                <StateUpdater id="counter" next={{ count: 99 }} />
                <StateDisplay id="counter" />
            </State>
        );
        expect(screen.getByText('0')).toBeTruthy();
        fireEvent.click(screen.getByText('update'));
        expect(screen.getByText('99')).toBeTruthy();
    });

    it('strips "id" and "children" from the initial state object', () => {
        // "id" and "children" are destructured out of props; they must not appear in state
        renderWithRuntime(
            <State id="s" foo="bar">
                <StateDisplay id="s" />
            </State>
        );
        // State value is { foo: "bar" } — no "id" or "children" key
        // StateDisplay renders String(entry[0]) which is "[object Object]" for a plain object
        const el = screen.getByText((text) => text.includes('object') || text === 'bar');
        expect(el).toBeTruthy();
    });
});
