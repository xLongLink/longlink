import { describe, it, expect } from 'bun:test';
import { screen, waitFor } from '@testing-library/react';
import { Query } from '../../src/primitives/Query';
import { useRuntime } from '../../src/runtime';
import { makeCtx, renderWithQuery } from './helpers';

/** Renders the value of ctx.queries[id] as a JSON string. */
function QueryDisplay({ id }: { id: string }) {
    const { ctx } = useRuntime();
    const data = ctx.queries[id];
    return <span>{data !== undefined ? JSON.stringify(data) : 'loading'}</span>;
}

describe('Query', () => {
    it('throws when "id" prop is missing', () => {
        expect(() => {
            renderWithQuery(<Query path="/api/data" />);
        }).toThrow('Query requires an "id" parameter');
    });

    it('throws when "path" prop is missing', () => {
        expect(() => {
            renderWithQuery(<Query id="myQuery" />);
        }).toThrow('Query requires a "path" parameter');
    });

    it('shows loading state before data arrives', () => {
        // fetch is not mocked here, so the query stays pending
        renderWithQuery(
            <Query id="items" path="/api/items">
                <QueryDisplay id="items" />
            </Query>
        );
        // While the request is in-flight the data is undefined → "loading"
        expect(screen.getByText('loading')).toBeTruthy();
    });

    it('makes fetched data available in the child context via its id', async () => {
        // Mock global fetch so no real HTTP request is made
        const original = global.fetch;
        global.fetch = (async () =>
            new Response(JSON.stringify({ name: 'Alice' }), {
                headers: { 'Content-Type': 'application/json' },
            })) as unknown as typeof global.fetch;

        try {
            renderWithQuery(
                <Query id="user" path="/api/user">
                    <QueryDisplay id="user" />
                </Query>
            );

            // Wait until the query resolves and re-renders with the data
            await waitFor(() => {
                expect(screen.getByText('{"name":"Alice"}')).toBeTruthy();
            });
        } finally {
            global.fetch = original;
        }
    });

    it('interpolates path template placeholders before fetching', async () => {
        // The path "/api/users/{userId}" should be resolved using the current context
        const captured: string[] = [];
        const original = global.fetch;
        global.fetch = ((url: URL | RequestInfo) => {
            captured.push(String(url));
            return Promise.resolve(new Response(JSON.stringify({}), {
                headers: { 'Content-Type': 'application/json' },
            }));
        }) as unknown as typeof global.fetch;

        try {
            const ctx = makeCtx({}, {}, { userId: '42' });
            renderWithQuery(
                <Query id="profile" path="/api/users/{userId}">
                    <QueryDisplay id="profile" />
                </Query>,
                ctx
            );

            await waitFor(() => expect(captured.length).toBeGreaterThan(0));
            expect(captured[0]).toBe('/api/users/42');
        } finally {
            global.fetch = original;
        }
    });

    it('preserves existing queries in the child context', async () => {
        // An outer query "existing" must still be visible inside a nested Query
        const original = global.fetch;
        global.fetch = (async () =>
            new Response(JSON.stringify('new'), {
                headers: { 'Content-Type': 'application/json' },
            })) as unknown as typeof global.fetch;

        try {
            const ctx = makeCtx({}, { existing: 'keep-me' });
            renderWithQuery(
                <Query id="fresh" path="/api/fresh">
                    <QueryDisplay id="existing" />
                </Query>,
                ctx
            );

            // "existing" should be visible immediately (it came from the parent ctx)
            expect(screen.getByText('"keep-me"')).toBeTruthy();
        } finally {
            global.fetch = original;
        }
    });
});
