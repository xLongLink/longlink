// @vitest-environment happy-dom
import { act, Suspense } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { renderPlatform } from '../../render';
import userEvent from '@testing-library/user-event';
import Page from '@/platform/routes/admin/Operations';
import { zOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';

it('keeps unfinished resource history readable without a resolved resource name', () => {
    // Arrange
    const operation = zOperationResponse.parse({
        id: '00000000-0000-4000-8000-000000000003',
        kind: 'solution.deploy',
        target_id: '00000000-0000-4000-8000-000000000004',
        resource_name: null,
        status: 'scheduled',
        failed: null,
        created_at: '2026-10-16T12:00:00Z',
        finished_at: null
    });

    // Act
    const output = renderPlatform(<Page />, '/admin/operations', [
        ['/api/v1/operations?page=1&page_size=25&search=', { items: [operation], total: 1 }]
    ]);

    // Assert
    expect(output.textContent).toContain('Solution deployment');
    expect(output.textContent).toContain('Planned');
    expect(output.textContent).toContain('Resource unavailable');
});

it('advances again while the previous result page is still loading', async () => {
    const user = userEvent.setup();
    const requests: number[] = [];
    let finishSecond: (response: Response) => void = () => undefined;

    const second = new Promise<Response>((resolve) => {
        finishSecond = resolve;
    });

    const result = (page: number) => ({
        items: [
            {
                id: `00000000-0000-4000-8000-00000000000${page}`,
                kind: 'solution.deploy',
                target_id: '00000000-0000-4000-8000-000000000004',
                resource_name: `Result page ${page}`,
                status: 'scheduled',
                failed: null,
                created_at: '2026-10-16T12:00:00Z',
                finished_at: null
            }
        ],
        total: 75
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const url = new URL(request.url);

        if (url.pathname !== '/api/v1/operations') throw new Error(`Unexpected request: ${url.pathname}`);
        const page = Number(url.searchParams.get('page'));
        requests.push(page);

        return page === 2 ? second : Response.json(result(page));
    });

    try {
        await withMounted(
            <Suspense fallback="Loading operations">
                <Page />
            </Suspense>,
            async (output) => {
                await vi.waitFor(() => expect(output.textContent).toContain('Result page 1'));
                const next = output.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]');

                if (!next) throw new Error('Expected operations pagination');
                await act(async () => user.click(next));
                expect(requests).toContain(2);
                expect(output.textContent).toContain('Result page 1');
                expect(output.querySelector('[aria-current="page"]')?.textContent).toBe('2');
                await act(async () => user.click(next));
                await vi.waitFor(() => expect(output.textContent).toContain('Result page 3'));
                expect(requests).toContain(3);
                await act(async () => {
                    finishSecond(Response.json(result(2)));
                    await second;
                });
                expect(output.textContent).toContain('Result page 3');
                expect(output.textContent).not.toContain('Result page 2');
            }
        );
    } finally {
        finishSecond(Response.json(result(2)));
        transport.mockRestore();
    }
});
