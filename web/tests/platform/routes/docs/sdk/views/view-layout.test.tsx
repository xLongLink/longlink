// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../../../render';
import * as components from '@/components/longlink';
import userEvent from '@testing-library/user-event';
import { RequestContext } from '@/lib/view-capabilities';
import ViewLayout from '@/platform/routes/docs/sdk/views/view-layout';
import FormDocumentation from '@/platform/routes/docs/sdk/views/form-documentation';
import { componentDocumentation, documentationPaths } from '@/platform/publications';
import viewCatalog from '../../../../../../../sdk/longlink/.static/jsx/components.json';

it('registers a website reference for each component in the SDK catalog', () => {
    const groupedPages: Readonly<Record<string, string>> = { ButtonGroup: 'Button', Controller: 'Form' };
    const pages = new Map(componentDocumentation.map(({ name, slug }) => [name, `/docs/sdk/views/${slug}`]));

    const missing = viewCatalog.components
        .map(({ name }) => ({ name, path: pages.get(groupedPages[name] ?? name) }))
        .filter(({ path }) => !path || !documentationPaths.includes(path))
        .map(({ name }) => name);

    expect(missing).toEqual([]);
});

it('documents every public Dropdown component under the Dropdown reference', () => {
    const dropdown = viewCatalog.components.find(({ name }) => name === 'Dropdown');
    const documented = new Set(
        dropdown?.properties?.map(({ name }) => (name.includes('.') ? name.split('.')[0] : 'Dropdown'))
    );
    const missing = Object.keys(components).filter((name) => name.startsWith('Dropdown') && !documented.has(name));

    expect(missing).toEqual([]);
});

it('switches between the example and authored companion references without merging published properties', async () => {
    const user = userEvent.setup();

    await withMounted(
        <ViewLayout
            name="Button"
            properties={[
                { name: 'size', type: 'AuthoredButtonSize' },
                { name: 'ButtonGroup.orientation', type: 'AuthoredOrientation' },
                { name: 'ButtonGroupSeparator.orientation', type: 'AuthoredSeparatorOrientation' }
            ]}
            example={{ title: 'Plain card', code: '<Card />', preview: <p>Order details</p> }}
        />,
        async (output) => {
            const [exampleTab, propertiesTab] = output.querySelectorAll<HTMLButtonElement>('[role="tab"]');

            if (!exampleTab || !propertiesTab) throw new Error('Expected example and properties tabs');
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toContain('Order details');
            expect(output.querySelector('table')).toBeNull();
            await act(async () => user.click(propertiesTab));
            expect(output.textContent).not.toContain('Order details');
            expect(Array.from(output.querySelectorAll('table'), (table) => table.getAttribute('aria-label'))).toEqual([
                'Button properties',
                'ButtonGroup properties',
                'ButtonGroupSeparator properties'
            ]);
            expect(
                Array.from(output.querySelectorAll('tbody tr'), (row) =>
                    Array.from(row.querySelectorAll('td'), (cell) => cell.textContent)
                )
            ).toEqual([
                ['size', 'AuthoredButtonSize', '"default"'],
                ['orientation', 'AuthoredOrientation', '"horizontal"'],
                ['orientation', 'AuthoredSeparatorOrientation', '"vertical"']
            ]);
            await act(async () => user.click(exampleTab));
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toContain('Order details');
            expect(output.querySelector('table')).toBeNull();
        }
    );
});

it('collapses the map preview attribution when it becomes available and leaves it open after reopening', async () => {
    const user = userEvent.setup();

    await withMounted(
        <ViewLayout
            name="StreetMap"
            example={{
                title: 'Street map',
                code: '<StreetMap />',
                preview: <details className="maplibregl-ctrl-attrib maplibregl-attrib-empty" />
            }}
        />,
        async (output) => {
            const attribution = output.querySelector<HTMLDetailsElement>('details.maplibregl-ctrl-attrib');
            const showCode = output.querySelector<HTMLElement>('[role="switch"][aria-label="Show code"]');
            if (!attribution || !showCode) throw new Error('Expected map attribution and code switch');

            attribution.open = true;
            attribution.classList.remove('maplibregl-attrib-empty');
            attribution.classList.add('maplibregl-compact', 'maplibregl-compact-show');

            await vi.waitFor(() => expect(attribution.open).toBe(false));
            expect(attribution.classList.contains('maplibregl-compact-show')).toBe(false);

            attribution.open = true;
            attribution.classList.add('maplibregl-compact-show');
            await act(async () => user.click(showCode));
            await act(async () => user.click(showCode));

            expect(output.querySelector('details.maplibregl-ctrl-attrib')).toBe(attribution);
            expect(attribution.open).toBe(true);
            expect(attribution.classList.contains('maplibregl-compact-show')).toBe(true);
        }
    );
});

it('keeps an edited form preview local through code toggles and submission', async () => {
    const user = userEvent.setup();
    const code = 'const retainedPreviewExample = true;';
    const request = vi.fn().mockResolvedValue({});

    await withMounted(
        <RequestContext value={{ request }}>
            <FormDocumentation name="Input" code={code} preview={<input aria-label="Preview draft" />} />
        </RequestContext>,
        async (output) => {
            const input = output.querySelector<HTMLInputElement>('input[aria-label="Preview draft"]');
            const toggle = output.querySelector<HTMLElement>('[role="switch"][aria-label="Show code"]');
            const form = output.querySelector('form');

            if (!input || !toggle || !form) throw new Error('Expected preview form and code switch');
            await act(async () => user.type(input, 'Keep this draft'));
            await act(async () => user.click(toggle));
            expect(output.textContent).toContain(code);
            await act(async () => user.keyboard(' '));
            expect(output.textContent).not.toContain(code);
            expect(output.querySelector('input[aria-label="Preview draft"]')).toBe(input);

            const submission = new Event('submit', { bubbles: true, cancelable: true });

            await act(async () => {
                form.dispatchEvent(submission);
            });

            expect(submission.defaultPrevented).toBe(true);
            expect(request).not.toHaveBeenCalled();
            expect(input.value).toBe('Keep this draft');
        }
    );
});
