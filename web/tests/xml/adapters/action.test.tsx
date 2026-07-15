import { describe, expect, it } from 'bun:test';
import type { ExecutionContext } from '@/xml/types';
import { executeAction } from '@/xml/adapters/Action';

describe('Action', () => {
    /* The action shell should send a request with a JSON payload. */
    it('sends a request and invalidates after success', async () => {
        const invalidations: Array<string | string[]> = [];
        let successCalls = 0;
        let errorCalls = 0;
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async (ids) => {
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
                success: () => {
                    successCalls += 1;
                },
                error: () => {
                    errorCalls += 1;
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
        expect(successCalls).toBe(1);
        expect(errorCalls).toBe(0);
    });

    /* HTTP and transport failures must stop before invalidation and success notification. */
    it('reports request failures without invalidating', async () => {
        const cases: Array<{ request: () => Promise<Response>; expectedError: string }> = [
            {
                request: async () => new Response('', { status: 422 }),
                expectedError: 'Request failed with status 422',
            },
            {
                request: async () => {
                    throw new Error('Network unavailable');
                },
                expectedError: 'Network unavailable',
            },
        ];

        for (const testCase of cases) {
            let invalidationCalls = 0;
            let successCalls = 0;
            let errorMessage = '';
            const ctx: ExecutionContext = {
                setups: {},
                invalidate: async () => {
                    invalidationCalls += 1;
                },
                values: {},
            };
            const fetchImpl = (async () => testCase.request()) as unknown as typeof fetch;

            await executeAction(
                {
                    action: '/example/profile',
                    invalidate: '${["profile", "activity"]}',
                },
                ctx,
                '',
                fetchImpl,
                {
                    success: () => {
                        successCalls += 1;
                    },
                    error: (message) => (errorMessage = message),
                }
            );

            expect(invalidationCalls).toBe(0);
            expect(successCalls).toBe(0);
            expect(errorMessage).toBe(testCase.expectedError);
        }
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

    /* Invalid action configuration must fail before sending a request. */
    it('rejects invalid actions before fetching', async () => {
        const cases: Array<{
            props: Record<string, string>;
            values: Record<string, unknown>;
            expectedError: string;
        }> = [
            {
                props: { invalidate: 'selectedUsers' },
                values: {},
                expectedError: 'invalidate must evaluate to an array',
            },
            {
                props: { action: '/example/profile', method: 'TRACE' },
                values: {},
                expectedError: 'Unsupported action method TRACE',
            },
            {
                props: { action: 'https://example.com/profile' },
                values: {},
                expectedError: 'Action URL must be app-relative',
            },
            {
                props: { action: '/profile', json: '${{ name }}', method: 'GET' },
                values: { name: 'Ada' },
                expectedError: 'GET actions cannot send payloads',
            },
        ];

        for (const testCase of cases) {
            const ctx: ExecutionContext = {
                setups: {},
                invalidate: async () => {},
                values: testCase.values,
            };
            let fetchCalls = 0;
            let errorMessage = '';
            const fetchImpl = (async () => {
                fetchCalls += 1;

                return new Response('', { status: 204 });
            }) as unknown as typeof fetch;

            await executeAction(testCase.props, ctx, '', fetchImpl, {
                success: () => {},
                error: (message) => (errorMessage = message),
            });

            expect(fetchCalls).toBe(0);
            expect(errorMessage).toBe(testCase.expectedError);
        }
    });
});
