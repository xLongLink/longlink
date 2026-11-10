// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import Page from '@/platform/routes/auth/Mcp';
import { renderPlatform, user } from '../../render';

it('withholds approval actions until the server has validated the consent request', () => {
    // Act
    const output = renderPlatform(<Page />, '/mcp/authorize', [['/api/v1/me', user]]);

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe('Authorize MCP access');
    expect(output.textContent).toContain('Loading authorization request');
    expect(output.textContent).not.toContain('Allow access');
});

it.each([
    ['Allow access', true, 'https://client.example/callback?code=approved&state=returned'],
    ['Deny', false, 'https://client.example/callback?error=access_denied&state=returned'],
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
            code_challenge_method: 'S256',
        };

        const requests: Request[] = [];
        const decisions: unknown[] = [];

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
                    expires_in: 2592000,
                });
            }

            if (request.method === 'POST' && pathname === '/api/v1/mcp/consent') {
                decisions.push(await request.json());

                return Response.json({ url });
            }

            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        });

        try {
            const navigation = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined);

            try {
                await withMounted(
                    <Page />,
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
                        expect(decisions).toEqual([{ ...authorization, approve }]);
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
