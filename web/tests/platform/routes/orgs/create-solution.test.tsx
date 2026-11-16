// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import userEvent from '@testing-library/user-event';
import CreateSolution from '@/components/dialogs/create-solution';

it('gates creation on inspection and validation, retaining configuration through Back and a failed submission', async () => {
    // Arrange
    const completions: string[] = [];
    const requests: Request[] = [];
    const image = 'ghcr.io/xlonglink/sample:latest';
    const metadata = { image, description: 'Sample Solution', environments: [{ name: 'API_KEY', required: true }] };
    const submissions: unknown[] = [];
    let resolveInspection: (response: Response) => void = () => undefined;

    const inspectionResponse = new Promise<Response>((resolve) => {
        resolveInspection = resolve;
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        requests.push(request);

        if (request.method === 'GET' && new URL(request.url).pathname === '/api/v1/organizations/organization/image') {
            return inspectionResponse;
        }

        if (
            request.method === 'POST' &&
            new URL(request.url).pathname === '/api/v1/organizations/organization/solutions'
        ) {
            submissions.push(await request.json());
            return submissions.length === 1
                ? Response.json({ detail: 'Unavailable' }, { status: 503 })
                : new Response(null, { status: 204 });
        }

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    try {
        await withMounted(
            <CreateSolution
                open
                organizationId="organization"
                onSuccess={() => {
                    completions.push('created');
                }}
                onOpenChange={() => undefined}
            />,
            async () => {
                const events = userEvent.setup();
                const dialog = document.querySelector('[role="dialog"]');

                const input = dialog?.querySelector<HTMLInputElement>(
                    'input[placeholder="ghcr.io/longlink/dashboard:latest"]'
                );

                const inspect = Array.from(dialog?.querySelectorAll('button') ?? []).find(
                    (button) => button.textContent === 'Inspect'
                );

                if (!input || !inspect) throw new Error('Expected image inspection controls');

                // Act
                await act(async () => events.type(input, image));
                await act(async () => events.click(inspect));

                // Assert
                await vi.waitFor(() => expect(requests).toHaveLength(1));
                expect(requests.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual([
                    'GET /api/v1/organizations/organization/image'
                ]);
                expect([...new URL(requests[0]?.url ?? '').searchParams]).toEqual([['image', image]]);
                expect(input.disabled || input.closest('fieldset')?.disabled).toBe(true);
                expect(dialog?.querySelector('input[name="name"]')).toBeNull();
                expect(completions).toEqual([]);

                // Act
                await act(async () => resolveInspection(Response.json(metadata)));

                // Assert
                await vi.waitFor(() => expect(dialog?.querySelector('input[name="name"]')).not.toBeNull());
                expect(dialog?.querySelector('input[name="image"]')).toBeNull();
                expect(dialog?.querySelector<HTMLInputElement>('input[name="description"]')?.value).toBe(
                    'Sample Solution'
                );
                expect(requests).toHaveLength(1);
                expect(completions).toEqual([]);

                const name = dialog?.querySelector<HTMLInputElement>('input[name="name"]');
                const secret = dialog?.querySelector<HTMLInputElement>('input[name="envs.API_KEY"]');
                const create = dialog?.querySelector<HTMLButtonElement>('button[type="submit"]');
                const back = [...(dialog?.querySelectorAll('button') ?? [])].find(
                    (button) => button.textContent === 'Back'
                );

                if (!name || !secret || !create || !back) throw new Error('Expected configuration controls');

                // Invalid configuration cannot create a Solution, and focus moves to the invalid field.
                await act(async () => events.click(create));
                expect(submissions).toEqual([]);
                expect(document.activeElement).toBe(name);
                await act(async () => events.type(name, 'Sample'));
                await act(async () => events.click(create));
                expect(submissions).toEqual([]);
                expect(document.activeElement).toBe(secret);
                await act(async () => events.type(secret, 'fixture-api-key'));
                await act(async () => events.click(back));

                const resume = dialog?.querySelector<HTMLButtonElement>('button[type="submit"]');
                if (!resume) throw new Error('Expected the inspection action');
                await act(async () => events.click(resume));

                const retainedName = dialog?.querySelector<HTMLInputElement>('input[name="name"]');
                const retainedSecret = dialog?.querySelector<HTMLInputElement>('input[name="envs.API_KEY"]');
                const retry = dialog?.querySelector<HTMLButtonElement>('button[type="submit"]');
                if (!retainedName || !retainedSecret || !retry) throw new Error('Expected retained configuration');
                expect(retainedName.value).toBe('Sample');
                expect(retainedSecret.value).toBe('fixture-api-key');
                expect(requests).toHaveLength(1);

                // A failed creation keeps the configuration available for an explicit retry.
                await act(async () => events.click(retry));
                await vi.waitFor(() => expect(dialog?.textContent).toContain('Could not create the Solution.'));
                expect(completions).toEqual([]);
                expect(retainedName.value).toBe('Sample');
                expect(retainedSecret.value).toBe('fixture-api-key');
                expect(submissions).toEqual([
                    { image, name: 'Sample', description: 'Sample Solution', envs: { API_KEY: 'fixture-api-key' } }
                ]);
                await act(async () => events.click(retry));
                await vi.waitFor(() => expect(completions).toEqual(['created']));
                expect(submissions).toHaveLength(2);
            }
        );
    } finally {
        resolveInspection(Response.json(metadata));
        transport.mockRestore();
    }
});
