// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import userEvent from '@testing-library/user-event';
import CreateSolution from '@/platform/routes/orgs/CreateSolution';

it('waits for image inspection before advancing to metadata without creating a Solution', async () => {
    // Arrange
    const completions: string[] = [];
    const requests: Request[] = [];
    const image = 'ghcr.io/xlonglink/sample:latest';
    const metadata = { image, description: 'Sample Solution', environments: [] };
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

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    try {
        await withMounted(
            <CreateSolution
                organizationId="organization"
                onSuccess={() => {
                    completions.push('created');
                }}
                onClose={() => undefined}
            />,
            async () => {
                const events = userEvent.setup();
                const dialog = document.querySelector('dialog');

                const input = dialog?.querySelector<HTMLInputElement>(
                    'input[placeholder="ghcr.io/longlink/dashboard:latest"]'
                );

                const inspect = Array.from(dialog?.querySelectorAll('button') ?? []).find(
                    (button) => button.textContent === 'Inspect'
                );

                const imagePanel = dialog?.querySelector<HTMLElement>('[data-step-panel="0"]');
                const metadataPanel = dialog?.querySelector<HTMLElement>('[data-step-panel="1"]');

                if (!input || !inspect || !imagePanel || !metadataPanel)
                    throw new Error('Expected image inspection controls');

                // Act
                await act(async () => events.type(input, image));
                await act(async () => events.click(inspect));

                // Assert
                await vi.waitFor(() => expect(requests).toHaveLength(1));
                expect(requests.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual([
                    'GET /api/v1/organizations/organization/image',
                ]);
                expect([...new URL(requests[0]?.url ?? '').searchParams]).toEqual([['image', image]]);
                expect(imagePanel.hidden).toBe(false);
                expect(metadataPanel.hidden).toBe(true);
                expect(completions).toEqual([]);

                // Act
                await act(async () => resolveInspection(Response.json(metadata)));

                // Assert
                await vi.waitFor(() => expect(metadataPanel.hidden).toBe(false));
                expect(imagePanel.hidden).toBe(true);
                expect(dialog?.querySelector<HTMLInputElement>('input[name="description"]')?.value).toBe(
                    'Sample Solution'
                );
                expect(requests).toHaveLength(1);
                expect(completions).toEqual([]);
            }
        );
    } finally {
        resolveInspection(Response.json(metadata));
        transport.mockRestore();
    }
});
