import { executeAction } from '@xml/adapters/Action';
import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Action', () => {
    /* The action shell should send a request with a JSON payload. */
    it('sends a request and invalidates after success', async () => {
        let invalidateCalls = 0;
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {
                invalidateCalls += 1;
            },
            values: {
                fullName: 'Ada Lovelace',
                email: 'ada@example.com',
                notes: 'Build the first program',
            },
        };

        let requestUrl = '';
        let requestInit: RequestInit | undefined;
        let fetchCalls = 0;

        const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
            fetchCalls += 1;
            requestUrl = String(input);
            requestInit = init;

            return new Response('', { status: 204 });
        }) as unknown as typeof fetch;

        await executeAction(
            {
                action: '/example/profile',
                json: '${{ fullName: fullName, email: email, notes: notes }}',
                invalidate: '${["profile"]}',
            },
            ctx,
            '/example/profile',
            fetchImpl,
            { success: () => {}, error: () => {} }
        );

        expect(requestUrl).toBe('/example/profile');
        expect(requestInit?.method).toBe('POST');
        expect(Object.fromEntries(new Headers(requestInit?.headers))).toEqual({ 'content-type': 'application/json' });
        expect(requestInit?.body).toBe(
            JSON.stringify({
                fullName: 'Ada Lovelace',
                email: 'ada@example.com',
                notes: 'Build the first program',
            })
        );
        expect(fetchCalls).toBe(1);
        expect(invalidateCalls).toBe(1);
    });

    /* Button children should become the clickable action trigger. */
    it('renders a wrapped button trigger in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML('<Action action="/example/profile"><Button i18n="Save profile" /></Action>')
        );

        expect(output).toContain('<button');
        expect(output).toContain('type="button"');
        expect(output).toContain('Save profile');
    });

    /* Icon children should become clickable when wrapped by Action. */
    it('renders a wrapped icon trigger in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML('<Action action="/example/profile"><Icon name="layout-grid" /></Action>')
        );

        expect(output).toContain('<button');
        expect(output).toContain('type="button"');
        expect(output).toContain('aria-label="layout-grid"');
    });

    /* The action shell should still invalidate without an endpoint. */
    it('invalidates slots when no action is configured', async () => {
        let invalidateCalls = 0;
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {
                invalidateCalls += 1;
            },
            values: {},
        };

        let fetchCalls = 0;
        const fetchImpl = (async () => {
            fetchCalls += 1;

            return new Response('', { status: 204 });
        }) as unknown as typeof fetch;

        await executeAction(
            {
                invalidate: '${["selectedUserId"]}',
            },
            ctx,
            '',
            fetchImpl,
            { success: () => {}, error: () => {} }
        );

        expect(invalidateCalls).toBe(1);
        expect(fetchCalls).toBe(0);
    });

    /* The invalidation list must be an array expression so runtime refreshes stay predictable. */
    it('throws when invalidate is not an array', async () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
        };

        await expect(
            executeAction(
                {
                    invalidate: 'selectedUsers',
                },
                ctx,
                ''
            )
        ).rejects.toThrow('invalidate must evaluate to an array');
    });
});
