import { parseXML } from '@xml/core/parser';
import { describe, expect, it, mock } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

let runtimeContext = {
    setups: {},
    invalidate: async (_ids: string | string[]) => {},
    values: {},
};

mock.module('@xml/core/context', () => ({
    useXmlContext: () => ({ ctx: runtimeContext }),
}));

mock.module('@xml/core/url', () => ({
    useUrl: (value: string) => value,
}));

mock.module('sonner', () => ({
    toast: {
        success: () => {},
        error: () => {},
    },
}));

const { Action } = await import('@xml/adapters/Action');

describe('Action', () => {
    /* The action shell should send a request with a JSON payload. */
    it('sends a request and invalidates after success', async () => {
        let invalidateCalls = 0;
        const invalidate = async () => {
            invalidateCalls += 1;
        };
        runtimeContext = {
            setups: {},
            invalidate,
            values: {
                fullName: 'Ada Lovelace',
                email: 'ada@example.com',
                notes: 'Build the first program',
            },
        };

        const originalFetch = globalThis.fetch;
        let requestUrl = '';
        let requestInit: RequestInit | undefined;
        let fetchCalls = 0;

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            fetchCalls += 1;
            requestUrl = String(input);
            requestInit = init;

            return new Response('', { status: 204 });
        }) as typeof fetch;

        try {
            const element = Action({
                props: {
                    action: '/example/profile',
                    json: '${{ fullName: fullName, email: email, notes: notes }}',
                    invalidate: '["profile"]',
                },
                nodes: [{ name: 'Text', params: { value: 'Save profile' } }],
            });

            await element.props.onClick();

            expect(requestUrl).toBe('/example/profile');
            expect(requestInit?.method).toBe('POST');
            expect(requestInit?.headers).toEqual({ 'content-type': 'application/json' });
            expect(requestInit?.body).toBe(
                JSON.stringify({
                    fullName: 'Ada Lovelace',
                    email: 'ada@example.com',
                    notes: 'Build the first program',
                })
            );
            expect(fetchCalls).toBe(1);
            expect(invalidateCalls).toBe(1);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    /* The trigger content should come directly from the children. */
    it('renders the child label in static markup', () => {
        const output = renderXmlToMarkup(parseXML('<Action action="/example/profile">Save profile</Action>'));

        expect(output).toContain('<button');
        expect(output).toContain('Save profile');
    });

    /* The action shell should still invalidate without an endpoint. */
    it('invalidates slots when no action is configured', async () => {
        let invalidateCalls = 0;
        const invalidate = async () => {
            invalidateCalls += 1;
        };
        runtimeContext = {
            setups: {},
            invalidate,
            values: {},
        };

        const originalFetch = globalThis.fetch;
        let fetchCalls = 0;
        globalThis.fetch = (async () => {
            fetchCalls += 1;

            return new Response('', { status: 204 });
        }) as typeof fetch;

        try {
            const element = Action({
                props: {
                    invalidate: '["selectedUserId"]',
                },
                nodes: [{ name: 'Text', params: { value: 'Reset' } }],
            });

            await element.props.onClick();

            expect(invalidateCalls).toBe(1);
            expect(fetchCalls).toBe(0);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
