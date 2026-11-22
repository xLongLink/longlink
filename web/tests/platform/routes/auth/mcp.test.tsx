// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import Page from '@/platform/routes/auth/mcp';
import { ApiErrorContext } from '@/lib/errors';
import { renderPlatform, user } from '../../render';
import { AccountProvider } from '@/platform/account';

it('withholds approval actions until the server has validated the consent request', () => {
    // Act
    const output = renderPlatform(<Page />, '/mcp/authorize', [['/api/v1/me', user]]);

    // Assert
    expect(output.querySelector('[name="decision"]')).toBeNull();
});

it.each([
    ['Allow access', true, 'https://client.example/callback?code=approved&state=returned'],
    ['Deny', false, 'https://client.example/callback?error=access_denied&state=returned']
] as const)(
    'submits %s with the authorization parameters and follows the server redirect',
    async (label, approve, url) => {
        // Arrange
        const authorization = {
            client_id: '00000000-0000-4000-8000-000000000003',
            redirect_uri: 'https://client.example/callback?source=mcp&session=one%2Btwo',
            response_type: 'code',
            resource: 'http://localhost/api/v1/solutions/00000000-0000-4000-8000-000000000004/proxy/mcp',
            scope: 'mcp',
            state: 'session +/&?=#% value',
            code_challenge: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
            code_challenge_method: 'S256'
        };

        const requests: Request[] = [];

        const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
            const request = input instanceof Request ? input : new Request(input, options);
            const pathname = new URL(request.url).pathname;
            requests.push(request);

            if (request.method === 'GET' && pathname === '/api/v1/me') return Response.json(user);

            if (request.method === 'GET' && pathname === '/api/v1/mcp/consent') {
                return Response.json({
                    client_name: 'MCP client',
                    redirect_uri: authorization.redirect_uri,
                    solution_name: 'Invoices',
                    expires_in: 2592000
                });
            }

            if (request.method === 'POST' && pathname === '/api/v1/mcp/consent') {
                return Response.json({ url });
            }

            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        });

        try {
            const navigation = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined);

            try {
                await withMounted(
                    <AccountProvider>
                        <Page />
                    </AccountProvider>,
                    async (output) => {
                        await act(async () => {
                            await vi.waitFor(() =>
                                expect(output.textContent).toContain('MCP client requests access to Invoices.')
                            );
                        });

                        const button = Array.from(output.querySelectorAll('button')).find(
                            (candidate) => candidate.textContent === label
                        );

                        if (!button) throw new Error(`Expected the ${label} button`);

                        // Act
                        await act(async () => button.click());

                        // Assert
                        await vi.waitFor(() => expect(navigation).toHaveBeenCalledExactlyOnceWith(url));
                        expect(requests.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual(
                            ['GET /api/v1/me', 'GET /api/v1/mcp/consent', 'POST /api/v1/mcp/consent']
                        );
                        const consentRequest = requests[1];

                        if (!consentRequest) throw new Error('Expected the consent request');

                        expect(Object.fromEntries(new URL(consentRequest.url).searchParams)).toEqual(authorization);

                        const decisionRequest = requests[2];

                        if (!decisionRequest) throw new Error('Expected the decision request');

                        expect(new URL(decisionRequest.url).search).toBe('');
                        expect(await decisionRequest.clone().json()).toEqual({ ...authorization, approve });
                    },
                    `/mcp/authorize?${new URLSearchParams(authorization)}`
                );
            } finally {
                navigation.mockRestore();
            }
        } finally {
            transport.mockRestore();
        }
    }
);

it('prevents duplicate decisions while pending and permits retry after a reported, invalid redirect response', async () => {
    // Arrange
    const decisions: Request[] = [];
    const responses: Array<(response: Response) => void> = [];
    const reportError = vi.fn();
    const url = 'https://client.example/callback?error=access_denied';
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const pathname = new URL(request.url).pathname;

        if (request.method === 'GET' && pathname === '/api/v1/me') return Response.json(user);

        if (request.method === 'GET' && pathname === '/api/v1/mcp/consent') {
            return Response.json({
                client_name: 'MCP client',
                redirect_uri: 'https://client.example/callback',
                solution_name: 'Invoices',
                expires_in: 2592000
            });
        }

        if (request.method === 'POST' && pathname === '/api/v1/mcp/consent') {
            decisions.push(request);
            return await new Promise<Response>((resolve) => responses.push(resolve));
        }

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });
    const navigation = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined);

    try {
        await withMounted(
            <ApiErrorContext value={reportError}>
                <AccountProvider>
                    <Page />
                </AccountProvider>
            </ApiErrorContext>,
            async (output) => {
                await act(async () => {
                    await vi.waitFor(() => expect(output.textContent).toContain('Allow access'));
                });

                const form = output.querySelector('form');
                const fieldset = form?.querySelector('fieldset');
                const allow = output.querySelector<HTMLButtonElement>('button[value="allow"]');
                const deny = output.querySelector<HTMLButtonElement>('button[value="deny"]');

                if (!form || !fieldset || !allow || !deny) throw new Error('Expected consent controls');

                // Activate both decisions before React can disable the fieldset.
                await act(async () => {
                    allow.click();
                    deny.click();
                });
                await vi.waitFor(() => expect(decisions).toHaveLength(1));
                await vi.waitFor(() => expect(form.getAttribute('aria-busy')).toBe('true'));
                expect(await decisions[0]?.clone().json()).toEqual({ approve: true });
                expect(fieldset.disabled).toBe(true);
                expect(navigation).not.toHaveBeenCalled();

                // An invalid response must not navigate or expose validation details inline.
                const fail = responses[0];

                if (!fail) throw new Error('Expected the pending decision');

                await act(async () => fail(Response.json({ url: 42 })));
                await vi.waitFor(() =>
                    expect(output.querySelector('[role="alert"]')?.textContent).toBe(
                        'Could not submit the decision. Please try again.'
                    )
                );
                expect(reportError).toHaveBeenCalledOnce();
                expect(navigation).not.toHaveBeenCalled();
                expect(form.getAttribute('aria-busy')).toBe('false');
                expect(fieldset.disabled).toBe(false);

                // Retry with the other decision and clear the previous error while pending.
                await act(async () => deny.click());
                await vi.waitFor(() => expect(decisions).toHaveLength(2));
                await vi.waitFor(() => expect(form.getAttribute('aria-busy')).toBe('true'));
                expect(await decisions[1]?.clone().json()).toEqual({ approve: false });
                expect(output.querySelector('[role="alert"]')).toBeNull();

                const succeed = responses[1];

                if (!succeed) throw new Error('Expected the retry decision');

                await act(async () => succeed(Response.json({ url })));
                await vi.waitFor(() => expect(navigation).toHaveBeenCalledExactlyOnceWith(url));
                expect(decisions).toHaveLength(2);
                expect(reportError).toHaveBeenCalledOnce();
            },
            '/mcp/authorize'
        );
    } finally {
        navigation.mockRestore();
        transport.mockRestore();
    }
});
