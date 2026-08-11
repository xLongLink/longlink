import { describe, expect, it } from 'vitest';
import { executeAction } from '@/xml/v1/adapters/Action';
import type { ASTProps, Scope, XmlRuntime } from '@/xml/v1/types';
import { compileProps } from '../helpers';

describe('Action', () => {
    it('sends a request and invalidates after success', async () => {
        const invalidations: Array<string | string[]> = [];
        let successCalls = 0;
        let errorCalls = 0;
        const ctx: XmlRuntime = {
            scope: {
                bindings: {
                    fullName: 'Ada Lovelace',
                    email: 'ada@example.com',
                    notes: 'Build the first program',
                },
            },
            services: {
                invalidate: async (ids) => {
                    invalidations.push(ids);
                },
                navigationBaseUrl: '',
                requestBaseUrl: '',
                setups: {},
            },
        };

        let requestUrl = '';
        let requestInit: RequestInit | undefined;

        const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
            requestUrl = String(input);
            requestInit = init;

            return new Response(null, { status: 204 });
        }) satisfies typeof fetch;

        await executeAction(
            compileProps({
                action: '/example/profile',
                json: '${{ fullName: fullName, email: email, notes: notes }}',
                invalidate: '${["profile", "activity"]}',
            }),
            ctx.scope,
            ctx.services,
            fetchImpl,
            (options) => {
                if (options.type === 'error') errorCalls += 1;
                else successCalls += 1;

                return () => {};
            }
        );

        expect(requestUrl).toBe('/example/profile');
        expect(requestInit?.method).toBe('POST');
        expect(requestInit?.credentials).toBe('include');
        expect(new Headers(requestInit?.headers).get('accept')).toBe('application/json');
        expect(new Headers(requestInit?.headers).get('content-type')).toBe('application/json');
        expect(requestInit?.body).toBe(
            JSON.stringify({
                fullName: 'Ada Lovelace',
                email: 'ada@example.com',
                notes: 'Build the first program',
            })
        );
        expect(invalidations).toEqual([['profile', 'activity']]);
        expect(successCalls).toBe(1);
        expect(errorCalls).toBe(0);
    });

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
            let errorMessage = '';
            const ctx: XmlRuntime = {
                scope: { bindings: {} },
                services: {
                    invalidate: async () => {
                        invalidationCalls += 1;
                    },
                    navigationBaseUrl: '',
                    requestBaseUrl: '',
                    setups: {},
                },
            };
            const fetchImpl = (() => testCase.request()) satisfies typeof fetch;

            await executeAction(
                compileProps({
                    action: '/example/profile',
                    invalidate: '${["profile", "activity"]}',
                }),
                ctx.scope,
                ctx.services,
                fetchImpl,
                (options) => {
                    if (options.type === 'error') errorMessage = String(options.body);

                    return () => {};
                }
            );

            expect(invalidationCalls).toBe(0);
            expect(errorMessage).toBe(testCase.expectedError);
        }
    });

    it('sends multipart form data with multiple files, primitives, nested values, and nulls', async () => {
        const firstFile = new File(['first supplier sheet'], 'first.txt');
        const secondFile = new File(['second supplier sheet'], 'second.txt');
        const ctx: XmlRuntime = {
            scope: {
                bindings: {
                    document: {
                        files: [firstFile, secondFile],
                        label: 'Supplier sheets',
                        quantity: 2,
                        published: false,
                        metadata: { category: 'suppliers' },
                        optional: null,
                    },
                },
            },
            services: { invalidate: async () => {}, navigationBaseUrl: '', requestBaseUrl: '', setups: {} },
        };

        let requestInit: RequestInit | undefined;

        const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
            requestInit = init;

            return new Response('', { status: 201 });
        }) satisfies typeof fetch;

        await executeAction(
            compileProps({
                action: '/files',
                form: '${{ files: document.files, label: document.label, quantity: document.quantity, published: document.published, metadata: document.metadata, optional: document.optional }}',
            }),
            ctx.scope,
            ctx.services,
            fetchImpl,
            () => () => {}
        );

        const body = requestInit?.body as FormData;
        const uploadedFiles = body.getAll('files') as File[];

        expect(body).toBeInstanceOf(FormData);
        expect(requestInit?.credentials).toBe('include');
        expect(new Headers(requestInit?.headers).get('accept')).toBe('application/json');
        expect(new Headers(requestInit?.headers).has('content-type')).toBe(false);
        expect(uploadedFiles.map((file) => file.name)).toEqual(['first.txt', 'second.txt']);
        expect(await uploadedFiles[0]?.text()).toBe('first supplier sheet');
        expect(await uploadedFiles[1]?.text()).toBe('second supplier sheet');
        expect(body.get('label')).toBe('Supplier sheets');
        expect(body.get('quantity')).toBe('2');
        expect(body.get('published')).toBe('false');
        expect(body.get('metadata')).toBe('{"category":"suppliers"}');
        expect(body.has('optional')).toBe(false);
    });

    it('rejects actions without an endpoint', async () => {
        const ctx: XmlRuntime = {
            scope: { bindings: {} },
            services: {
                invalidate: async () => {},
                navigationBaseUrl: '',
                requestBaseUrl: '',
                setups: {},
            },
        };

        let fetchCalls = 0;
        const fetchImpl = (async () => {
            fetchCalls += 1;

            return new Response(null, { status: 204 });
        }) satisfies typeof fetch;

        await executeAction(
            compileProps({
                invalidate: '${["selectedUserId"]}',
            }),
            ctx.scope,
            ctx.services,
            fetchImpl,
            () => () => {}
        );

        expect(fetchCalls).toBe(0);
    });

    it('rejects invalid actions before fetching', async () => {
        const cases: Array<{
            props: ASTProps;
            values: Scope['bindings'];
            expectedError: string;
        }> = [
            {
                props: compileProps({ invalidate: 'selectedUsers' }),
                values: {},
                expectedError: 'invalidate must evaluate to an array',
            },
            {
                props: compileProps({ action: '/example/profile', method: 'TRACE' }),
                values: {},
                expectedError: 'Unsupported action method TRACE',
            },
            {
                props: compileProps({ action: 'https://example.com/profile' }),
                values: {},
                expectedError: 'Action URL must be app-relative',
            },
            {
                props: compileProps({ action: '/profile', json: '${{ name }}', method: 'GET' }),
                values: { name: 'Ada' },
                expectedError: 'GET actions cannot send payloads',
            },
        ];

        for (const testCase of cases) {
            const ctx: XmlRuntime = {
                scope: { bindings: testCase.values },
                services: {
                    invalidate: async () => {},
                    navigationBaseUrl: '',
                    requestBaseUrl: '',
                    setups: {},
                },
            };
            let fetchCalls = 0;
            let errorMessage = '';
            const fetchImpl = (async () => {
                fetchCalls += 1;

                return new Response(null, { status: 204 });
            }) satisfies typeof fetch;

            await executeAction(testCase.props, ctx.scope, ctx.services, fetchImpl, (options) => {
                if (options.type === 'error') errorMessage = String(options.body);

                return () => {};
            });

            expect(fetchCalls).toBe(0);
            expect(errorMessage).toBe(testCase.expectedError);
        }
    });

    it.each([401, 403])('reports a %i response without closing or invalidating', async (status) => {
        let invalidationCalls = 0;
        let closeCalls = 0;
        let errorMessage = '';
        const ctx: XmlRuntime = {
            scope: { bindings: {} },
            services: {
                invalidate: async () => {
                    invalidationCalls += 1;
                },
                navigationBaseUrl: '',
                requestBaseUrl: '',
                setups: {},
            },
        };
        const fetchImpl = (async () => new Response(null, { status })) satisfies typeof fetch;

        await executeAction(
            compileProps({ action: '/example/profile', closeDialog: 'true', invalidate: '${["profile"]}' }),
            ctx.scope,
            ctx.services,
            fetchImpl,
            (options) => {
                if (options.type === 'error') errorMessage = String(options.body);

                return () => {};
            },
            () => {
                closeCalls += 1;
            }
        );

        expect(invalidationCalls).toBe(0);
        expect(closeCalls).toBe(0);
        expect(errorMessage).toBe(`Request failed with status ${status}`);
    });
});
