import { describe, expect, it } from 'vitest';
import { executeAction } from '@/xml/v1/adapters/Action';
import { createContext } from '@/xml/v1/core/context';
import type { ASTProps, Scope } from '@/xml/v1/types';
import { compileProps } from '../helpers';

describe('Action', () => {
    it('sends a request and invalidates after success', async () => {
        const invalidations: Array<string | string[]> = [];
        let notificationCalls = 0;
        const ctx = createContext();
        ctx.scope.bindings = {
            params: {},
            fullName: 'Ada Lovelace',
            email: 'ada@example.com',
            notes: 'Build the first program',
        };
        ctx.services.invalidate = async (ids) => {
            invalidations.push(ids);
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
            () => {
                notificationCalls += 1;

                return () => {};
            }
        );

        expect(requestUrl).toBe('/example/profile');
        expect(requestInit?.method).toBe('POST');
        expect(new Headers(requestInit?.headers).get('content-type')).toBe('application/json');
        expect(requestInit?.body).toBe(
            JSON.stringify({
                fullName: 'Ada Lovelace',
                email: 'ada@example.com',
                notes: 'Build the first program',
            })
        );
        expect(invalidations).toEqual([['profile', 'activity']]);
        expect(notificationCalls).toBe(1);
    });

    it('reports request failures without invalidating or closing dialogs', async () => {
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
            let closeCalls = 0;
            let errorMessage = '';
            const ctx = createContext();
            ctx.services.invalidate = async () => {
                invalidationCalls += 1;
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
                },
                () => {
                    closeCalls += 1;
                }
            );

            expect(invalidationCalls).toBe(0);
            expect(closeCalls).toBe(0);
            expect(errorMessage).toBe(testCase.expectedError);
        }
    });

    it('sends multipart form data with multiple files, primitives, nested values, and nulls', async () => {
        const firstFile = new File(['first supplier sheet'], 'first.txt');
        const secondFile = new File(['second supplier sheet'], 'second.txt');
        const ctx = createContext();
        ctx.scope.bindings.document = {
            files: [firstFile, secondFile],
            label: 'Supplier sheets',
            quantity: 2,
            published: false,
            metadata: { category: 'suppliers' },
            optional: null,
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
        const ctx = createContext();

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
            const ctx = createContext();
            ctx.scope.bindings = { params: {}, ...testCase.values };
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

});
