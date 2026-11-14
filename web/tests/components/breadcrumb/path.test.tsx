// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { renderStatic, withMounted } from '../../render';
import { PathBreadcrumb } from '@/components/breadcrumb/path';
import { Link as RouterLink, useNavigate } from 'react-router';
import { BreadcrumbItem } from '@/components/breadcrumb/breadcrumbs';

/** Exposes history traversal without replacing router behavior. */
function HistoryBack() {
    const navigate = useNavigate();

    return (
        <button type="button" onClick={() => void navigate(-1)}>
            Back
        </button>
    );
}

it('links ancestors but identifies the current page without a redundant link', () => {
    // Act
    const output = renderStatic(<PathBreadcrumb labels={{ docs: 'Documentation' }} />, '/docs/storage');

    // Assert
    expect(output.querySelector('a[href="/docs/"]')?.textContent).toContain('Documentation');
    expect(output.querySelector('[aria-current="page"]')?.textContent).toContain('Storage');
    expect(output.querySelector('a[href="/docs/storage/"]')).toBeNull();
});

it('updates the mounted trail after ancestor navigation, history traversal, and a different encoded path', async () => {
    // Keep the same breadcrumb mounted throughout real router transitions.
    await withMounted(
        <>
            <PathBreadcrumb labels={{ docs: 'Documentation' }} root={<BreadcrumbItem href="/">Home</BreadcrumbItem>} />
            <RouterLink to="/docs/hello%20world/">Another article</RouterLink>
            <HistoryBack />
        </>,
        async (output) => {
            const ancestor = output.querySelector<HTMLAnchorElement>('nav a[href="/docs/"]');

            if (!ancestor) throw new Error('Expected documentation ancestor');

            // Preserve native modified gestures rather than navigating the current tab.
            for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
                const event = new MouseEvent('click', { bubbles: true, cancelable: true, [modifier]: true });
                await act(async () => ancestor.dispatchEvent(event));
                expect(event.defaultPrevented).toBe(false);
                expect(output.querySelector('[aria-current="page"]')?.textContent).toBe('Storage');
            }

            // Navigate through the actual breadcrumb anchor, then return through history.
            await act(async () => ancestor.click());
            expect(output.querySelector('[aria-current="page"]')?.textContent).toBe('Documentation');
            expect(output.querySelector('nav a[href="/docs/"]')).toBeNull();

            const back = output.querySelector('button');

            if (!back) throw new Error('Expected history control');
            await act(async () => back.click());
            expect(output.querySelector('[aria-current="page"]')?.textContent).toBe('Storage');

            const article = output.querySelector<HTMLAnchorElement>('a[href="/docs/hello%20world/"]');

            if (!article) throw new Error('Expected article link');
            await act(async () => article.click());
            expect(output.querySelector('[aria-current="page"]')?.textContent).toBe('Hello World');
            expect(output.querySelector('nav')?.textContent).not.toContain('Storage');
            expect(output.querySelector('nav > ol > li a[href="/"]')?.textContent).toBe('Home');
        },
        '/docs/storage/'
    );
});
