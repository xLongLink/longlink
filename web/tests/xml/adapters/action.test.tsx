import { describe, expect, it } from 'bun:test';
import type { ExecutionContext } from '@/xml/types';
import { executeAction } from '@/xml/adapters/Action';

describe('Action', () => {
    /* The action shell should send a request with a JSON payload. */
    it('sends a request and invalidates after success', async () => {
        const events: string[] = [];
        const invalidations: Array<string | string[]> = [];
        const successMessages: string[] = [];
        const errorMessages: string[] = [];
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async (ids) => {
                events.push('invalidate');
                invalidations.push(ids);
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
            events.push('fetch');
            fetchCalls += 1;
            requestUrl = String(input);
            requestInit = init;

            return new Response('', { status: 204 });
        }) as unknown as typeof fetch;

        await executeAction(
            {
                action: '/example/profile',
                json: '${{ fullName: fullName, email: email, notes: notes }}',
                invalidate: '${["profile", "activity"]}',
            },
            ctx,
            '',
            fetchImpl,
            {
                success: (message) => {
                    events.push('success');
                    successMessages.push(message);
                },
                error: (message) => {
                    events.push('error');
                    errorMessages.push(message);
                },
            }
        );

        expect(requestUrl).toBe('/example/profile');
        expect(requestInit?.method).toBe('POST');
        expect(requestInit?.credentials).toBe('include');
        expect(Object.fromEntries(new Headers(requestInit?.headers))).toEqual({
            accept: 'application/json',
            'content-type': 'application/json',
        });
        expect(requestInit?.body).toBe(
            JSON.stringify({
                fullName: 'Ada Lovelace',
                email: 'ada@example.com',
                notes: 'Build the first program',
            })
        );
        expect(fetchCalls).toBe(1);
        expect(invalidations).toEqual([['profile', 'activity']]);
        expect(successMessages).toEqual(['Request completed with status 204']);
        expect(errorMessages).toEqual([]);
        expect(events).toEqual(['fetch', 'invalidate', 'success']);
    });

    /* Failed HTTP responses must stop before invalidation and success notification. */
    it('reports non-2xx responses without invalidating', async () => {
        const events: string[] = [];
        const invalidations: Array<string | string[]> = [];
        const successMessages: string[] = [];
        const errorMessages: string[] = [];
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async (ids) => {
                events.push('invalidate');
                invalidations.push(ids);
            },
            values: {},
        };
        const fetchImpl = (async () => {
            events.push('fetch');

            return new Response('', { status: 422 });
        }) as unknown as typeof fetch;

        await executeAction(
            {
                action: '/example/profile',
                invalidate: '${["profile", "activity"]}',
            },
            ctx,
            '',
            fetchImpl,
            {
                success: (message) => {
                    events.push('success');
                    successMessages.push(message);
                },
                error: (message) => {
                    events.push('error');
                    errorMessages.push(message);
                },
            }
        );

        expect(invalidations).toEqual([]);
        expect(successMessages).toEqual([]);
        expect(errorMessages).toEqual(['Request failed with status 422']);
        expect(events).toEqual(['fetch', 'error']);
    });

    /* The action shell should send multipart form data without a JSON content type. */
    it('sends multipart form data', async () => {
        const file = new File(['supplier sheet'], 'supplier.txt', { type: 'text/plain' });
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {
                document: {
                    file,
                    label: 'Supplier sheet',
                },
            },
        };

        let requestInit: RequestInit | undefined;

        const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
            requestInit = init;

            return new Response('', { status: 201 });
        }) as unknown as typeof fetch;

        await executeAction(
            {
                action: '/files',
                form: '${{ file: document.file, label: document.label }}',
            },
            ctx,
            '',
            fetchImpl,
            { success: () => {}, error: () => {} }
        );

        const body = requestInit?.body as FormData;
        const uploadedFile = body.get('file') as File;

        expect(requestInit?.method).toBe('POST');
        expect(Object.fromEntries(new Headers(requestInit?.headers))).toEqual({ accept: 'application/json' });
        expect(body).toBeInstanceOf(FormData);
        expect(uploadedFile.name).toBe('supplier.txt');
        expect(await uploadedFile.text()).toBe('supplier sheet');
        expect(body.get('label')).toBe('Supplier sheet');
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
    it('shows an error when invalidate is not an array', async () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
        };
        let errorMessage = '';

        await executeAction(
            {
                invalidate: 'selectedUsers',
            },
            ctx,
            '',
            fetch,
            { success: () => {}, error: (message) => (errorMessage = message) }
        );

        expect(errorMessage).toBe('invalidate must evaluate to an array');
    });

    /* The runtime should still reject methods outside the supported action set. */
    it('rejects unsupported methods', async () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
        };
        let fetchCalls = 0;
        let errorMessage = '';
        const fetchImpl = (async () => {
            fetchCalls += 1;

            return new Response('', { status: 204 });
        }) as unknown as typeof fetch;

        await executeAction(
            {
                action: '/example/profile',
                method: 'TRACE',
            },
            ctx,
            '',
            fetchImpl,
            { success: () => {}, error: (message) => (errorMessage = message) }
        );

        expect(fetchCalls).toBe(0);
        expect(errorMessage).toBe('Unsupported action method TRACE');
    });

    it('rejects external action URLs before fetching', async () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
        };
        let fetchCalls = 0;
        let errorMessage = '';
        const fetchImpl = (async () => {
            fetchCalls += 1;

            return new Response('', { status: 204 });
        }) as unknown as typeof fetch;

        await executeAction(
            {
                action: 'https://example.com/profile',
            },
            ctx,
            '',
            fetchImpl,
            { success: () => {}, error: (message) => (errorMessage = message) }
        );

        expect(fetchCalls).toBe(0);
        expect(errorMessage).toBe('Action URL must be app-relative');
    });

    it('rejects GET payloads before fetching', async () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: { name: 'Ada' },
        };
        let fetchCalls = 0;
        let errorMessage = '';
        const fetchImpl = (async () => {
            fetchCalls += 1;

            return new Response('', { status: 204 });
        }) as unknown as typeof fetch;

        await executeAction(
            {
                action: '/profile',
                json: '${{ name }}',
                method: 'GET',
            },
            ctx,
            '',
            fetchImpl,
            { success: () => {}, error: (message) => (errorMessage = message) }
        );

        expect(fetchCalls).toBe(0);
        expect(errorMessage).toBe('GET actions cannot send payloads');
    });

    it('shows an error when the request throws', async () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
        };
        let errorMessage = '';
        const fetchImpl = (async () => {
            throw new Error('Network unavailable');
        }) as unknown as typeof fetch;

        await executeAction(
            {
                action: '/profile',
            },
            ctx,
            '',
            fetchImpl,
            { success: () => {}, error: (message) => (errorMessage = message) }
        );

        expect(errorMessage).toBe('Network unavailable');
    });
});
