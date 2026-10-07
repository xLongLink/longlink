// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client';
import { act, type ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ViewLayout from '@/platform/routes/docs/sdk/views/ViewLayout';

describe('shared View documentation layout', () => {
    let root: ReturnType<typeof createRoot> | undefined;
    let container: HTMLDivElement | undefined;

    afterEach(async () => {
        // Release the article listeners and mounted content before restoring globals.
        const mountedRoot = root;
        if (mountedRoot) await act(async () => mountedRoot.unmount());

        root = undefined;
        container?.remove();
        container = undefined;
        vi.unstubAllGlobals();
    });

    it.each(['', '?tab=unknown'])('defaults to examples for query %s', async (query) => {
        // Render the shared owner rather than repeating shell assertions in individual pages.
        const output = await renderLayout(query);

        // Only the selected panel and its native preview are mounted.
        expect(output.querySelector('[role="tabpanel"]')?.id).toBe('component-examples');
        expect(output.querySelector('[aria-label="Greeting preview"]')?.textContent).toBe('Native preview');
        expect(output.querySelector('iframe')).toBeNull();
        expect(output.querySelector('#component-properties')).toBeNull();
        expect(output.querySelector('#component-best-practices')).toBeNull();
    });

    it.each([
        { tab: 'properties', label: 'label', description: 'Visible button text and accessible label.' },
        { tab: 'best-practices', label: 'Do', description: 'Use a descriptive label' },
    ])('renders the URL-selected $tab panel', async ({ tab, label, description }) => {
        // Select a reference tab directly through its public URL.
        const output = await renderLayout(`?tab=${tab}`);
        const panel = output.querySelector('[role="tabpanel"]');

        // The real reference table renders its content without mounting examples.
        expect(panel?.id).toBe(`component-${tab}`);
        expect(panel?.textContent).toContain(label);
        expect(panel?.textContent).toContain(description);
        expect(output.querySelector('[aria-label="Greeting preview"]')).toBeNull();
    });

    it('changes tabs without discarding other query parameters', async () => {
        // Drive the native tab control while observing real memory-router navigation.
        const output = await renderLayout('?campaign=guide&tab=examples');
        const user = userEvent.setup();
        const propertiesTab = output.querySelector<HTMLElement>('[role="tab"][aria-controls="component-properties"]');
        if (!propertiesTab) throw new Error('Missing Properties tab');

        await act(async () => user.click(propertiesTab));

        // Navigation updates both the selected content and the linkable query state.
        await vi.waitFor(() => expect(output.querySelector('[role="tabpanel"]')?.id).toBe('component-properties'));
        const search = new URLSearchParams(output.querySelector('output')?.textContent ?? '');
        expect(search.get('campaign')).toBe('guide');
        expect(search.get('tab')).toBe('properties');
        expect(output.querySelector('[aria-label="Greeting preview"]')).toBeNull();
    });

    it('renders runtime-owned content without component reference tabs', async () => {
        // Runtime documentation supplies its own content rather than component panels.
        const output = await renderLayout('?tab=properties', {
            name: 'Functions',
            children: <section id="reference">Runtime-owned content</section>,
        });

        // A component-tab query must not hide or replace runtime content.
        expect(output.querySelector('#reference')?.textContent).toBe('Runtime-owned content');
        expect(output.querySelector('[role="tablist"]')).toBeNull();
        expect(output.querySelector('[role="tabpanel"]')).toBeNull();
    });

    /** Mounts the real shared layout with a small authored reference and real routing. */
    async function renderLayout(
        query: string,
        overrides: Partial<ComponentProps<typeof ViewLayout>> = {}
    ): Promise<HTMLDivElement> {
        // Own each render and its cleanup within this suite.
        const output = document.createElement('div');
        container = output;
        document.body.append(output);
        const mountedRoot = createRoot(output);
        root = mountedRoot;
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

        // Authored guidance remains separate from the generated public property contract.
        await act(async () => {
            mountedRoot.render(
                <MemoryRouter initialEntries={[`/docs/sdk/views/buttons/${query}`]}>
                    <Location />
                    <ViewLayout
                        name="Button"
                        reference={{
                            introduction: 'An authored action reference.',
                            practices: [{ guidance: true, description: 'Use a descriptive label' }],
                        }}
                        examples={[
                            { title: 'Greeting', code: '<Text>Native preview</Text>', preview: <p>Native preview</p> },
                        ]}
                        {...overrides}
                    />
                </MemoryRouter>
            );
        });

        return output;
    }
});

/** Exposes navigation state without replacing router behavior. */
function Location() {
    const location = useLocation();

    return <output>{location.search}</output>;
}
