// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { withMounted } from '../../render';
import { Route, Routes } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ExploreSolutions from '@/platform/routes/explore-solutions';

const banner = 'https://example.com/banner.png';
const initialSolutions = [
    {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Orders',
        description: 'Manage orders',
        status: 'running',
        public: true,
        banner,
        deployed_version: null,
        organization: { id: '00000000-0000-4000-8000-000000000003', name: 'Acme' }
    },
    {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Inventory',
        description: 'Manage inventory',
        status: 'running',
        public: true,
        banner,
        deployed_version: null,
        organization: { id: '00000000-0000-4000-8000-000000000003', name: 'Acme' }
    }
];
let solutions = initialSolutions;

beforeEach(() => {
    solutions = initialSolutions;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;
        if (path === '/api/v1/public/solutions') {
            return Response.json({ items: solutions, total: solutions.length });
        }

        throw new Error(`Unexpected request: ${path}`);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

function ExplorePage() {
    const client = useQueryClient();

    return (
        <>
            <button type="button" onClick={() => void client.invalidateQueries({ queryKey: ['api'] })}>
                Reload
            </button>
            <ExploreSolutions />
        </>
    );
}

it('isolates failures for cards sharing a banner URL and keeps the failed card navigable', async () => {
    // Arrange
    await withMounted(
        <Routes>
            <Route path="/" element={<ExploreSolutions />} />
            <Route path="/orgs/:organization/solutions/:solution" element={<p>Solution opened</p>} />
        </Routes>,
        async (output) => {
            await vi.waitFor(() => expect(output.querySelectorAll('li a > img')).toHaveLength(2));
            const images = output.querySelectorAll('li a > img');

            // Act
            await act(async () => images[0].dispatchEvent(new Event('error')));

            // Assert
            const cards = output.querySelectorAll('li');
            expect(cards[0].querySelector('a > img')).toBeNull();
            expect(cards[1].querySelector('a > img')).toBe(images[1]);
            expect(cards[0].textContent).toContain('Manage orders');
            const link = cards[0].querySelector('a');
            if (!link) throw new Error('Expected the failed banner card to remain navigable');
            await act(async () => link.click());
            expect(output.textContent).toBe('Solution opened');
        }
    );
});

it('retries a replaced banner, including a previously failed URL', async () => {
    // Arrange
    await withMounted(<ExplorePage />, async (output) => {
        await vi.waitFor(() => expect(output.querySelectorAll('li a > img')).toHaveLength(2));
        const failedImage = output.querySelector('li a > img');
        if (!failedImage) throw new Error('Expected a banner');
        await act(async () => failedImage.dispatchEvent(new Event('error')));
        const reload = output.querySelector('button');
        if (!reload) throw new Error('Expected a reload action');

        // Act
        solutions = initialSolutions.map((solution) => ({
            ...solution,
            banner: 'https://example.com/replacement.png'
        }));
        await act(async () => reload.click());

        // Assert
        await vi.waitFor(() =>
            expect(output.querySelector('li a > img')?.getAttribute('src')).toBe('https://example.com/replacement.png')
        );
        const replacement = output.querySelector('li a > img');
        if (!replacement) throw new Error('Expected a replacement banner');
        await act(async () => replacement.dispatchEvent(new Event('error')));
        solutions = initialSolutions;
        await act(async () => reload.click());
        await vi.waitFor(() => expect(output.querySelectorAll('li a > img')).toHaveLength(2));
        expect(output.querySelector('li a > img')?.getAttribute('src')).toBe(banner);
        expect(output.querySelector('li a > img')).not.toBe(failedImage);
    });
});

it('retries the same banner after its card is removed and remounted', async () => {
    // Arrange
    await withMounted(<ExplorePage />, async (output) => {
        await vi.waitFor(() => expect(output.querySelectorAll('li a > img')).toHaveLength(2));
        const failedImage = output.querySelector('li a > img');
        if (!failedImage) throw new Error('Expected a banner');
        await act(async () => failedImage.dispatchEvent(new Event('error')));
        const reload = output.querySelector('button');
        if (!reload) throw new Error('Expected a reload action');

        // Act
        solutions = initialSolutions.slice(1);
        await act(async () => reload.click());
        await vi.waitFor(() => expect(output.querySelectorAll('li')).toHaveLength(1));
        solutions = initialSolutions;
        await act(async () => reload.click());

        // Assert
        await vi.waitFor(() => expect(output.querySelectorAll('li a > img')).toHaveLength(2));
        expect(output.querySelector('li a > img')?.getAttribute('src')).toBe(banner);
        expect(output.querySelector('li a > img')).not.toBe(failedImage);
    });
});
