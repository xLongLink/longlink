// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import { Link as RouterLink, useNavigate } from 'react-router';
import { buildBreadcrumbs, PathBreadcrumb } from '@/components/ui/breadcrumbs';

/** Exposes history traversal without replacing router behavior. */
function HistoryBack() {
    const navigate = useNavigate();

    return (
        <button type="button" onClick={() => void navigate(-1)}>
            Back
        </button>
    );
}

it('updates the mounted trail after ancestor navigation, history traversal, and a different encoded path', async () => {
    // Keep the same breadcrumb mounted throughout real router transitions.
    await withMounted(
        <>
            <PathBreadcrumb labels={{ docs: 'Documentation' }} root={{ label: 'Home', href: '/' }} />
            <RouterLink to="/docs/hello%20world/example/">Another article</RouterLink>
            <HistoryBack />
        </>,
        async (output) => {
            const ancestor = output.querySelector<HTMLAnchorElement>('nav a[href="/docs/"]');

            if (!ancestor) throw new Error('Expected documentation ancestor');
            expect(ancestor.textContent).toBe('Documentation');

            // Navigate through the actual breadcrumb anchor, then return through history.
            await act(async () => ancestor.click());
            expect(output.querySelector('[aria-current="page"]')?.textContent).toBe('Documentation');
            expect(output.querySelector('nav a[href="/docs/"]')).toBeNull();

            const back = output.querySelector('button');

            if (!back) throw new Error('Expected history control');
            await act(async () => back.click());
            expect(output.querySelector('[aria-current="page"]')?.textContent).toBe('Storage');

            const article = output.querySelector<HTMLAnchorElement>('a[href="/docs/hello%20world/example/"]');

            if (!article) throw new Error('Expected article link');
            await act(async () => article.click());
            expect(output.querySelector('[aria-current="page"]')?.textContent).toBe('Example');
            expect(output.querySelector('nav a[href="/docs/hello%20world/"]')?.textContent).toBe('Hello World');
            expect(output.querySelector('nav')?.textContent).not.toContain('Storage');
            expect(output.querySelector('nav > ol > li a[href="/"]')?.textContent).toBe('Home');
        },
        '/docs/storage/'
    );
});

it('keeps opaque path segments intact in links while choosing readable labels', () => {
    // Arrange
    const uuid = '01ad5c1f-A080-4242-8B39-194381c39287';
    const project = `/projects/${uuid}/`;

    // Act and Assert
    expect(buildBreadcrumbs(project).at(-1)).toEqual({ label: uuid, href: project });
    expect(buildBreadcrumbs(project, { [uuid]: 'Project' }).at(-1)).toEqual({ label: 'Project', href: project });
    expect(buildBreadcrumbs('/%invalid/')).toEqual([{ label: 'Invalid', href: '/%invalid/' }]);
});
