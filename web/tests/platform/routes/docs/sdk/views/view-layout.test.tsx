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
import ChartDocumentation from '@/platform/routes/docs/sdk/views/chart-documentation';
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

it('switches to the shared reference without losing published props or companion tables', async () => {
    const user = userEvent.setup();

    await withMounted(
        <ViewLayout
            name="Button"
            relatedComponents={['ButtonGroup']}
            example={{ title: 'Plain card', code: '<Card />', preview: <p>Order details</p> }}
        />,
        async (output) => {
            const [exampleTab, propertiesTab] = output.querySelectorAll<HTMLButtonElement>('[role="tab"]');

            if (!exampleTab || !propertiesTab) throw new Error('Expected example and properties tabs');
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toContain('Order details');
            expect(output.querySelector('table')).toBeNull();
            await act(async () => user.click(propertiesTab));
            expect(output.textContent).not.toContain('Order details');
            expect(output.querySelector('table')?.getAttribute('aria-label')).toBe('Button properties');
            expect(output.textContent).toContain('nativeButton');
            const labelReference = output.querySelector('table[aria-label="ButtonGroupText properties"]');
            expect(labelReference?.textContent).toContain('render');
            const separatorReference = output.querySelector('table[aria-label="ButtonGroupSeparator properties"]');
            expect(separatorReference?.textContent).toContain('orientation');
            expect(separatorReference?.textContent).toContain('"vertical"');
            await act(async () => user.click(exampleTab));
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toContain('Order details');
            expect(output.querySelector('table')).toBeNull();
        }
    );
});

it('shows authored hook properties without copying them to an absent companion reference', async () => {
    // Arrange
    const user = userEvent.setup();

    await withMounted(
        <ViewLayout
            name="useApi"
            relatedComponents={['MissingCompanion']}
            properties={[
                { name: 'path', type: 'string', description: 'The Solution endpoint to query.' },
                { name: 'data', type: 'ViewData', default: [] }
            ]}
        >
            <p>Hook example</p>
        </ViewLayout>,
        async (output) => {
            const propertiesTab = Array.from(output.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
                (tab) => tab.textContent === 'Properties'
            );
            if (!propertiesTab) throw new Error('Expected properties tab');

            // Act
            await act(async () => user.click(propertiesTab));

            // Assert
            expect(output.textContent).not.toContain('Hook example');
            const tables = output.querySelectorAll('table');
            expect(tables).toHaveLength(1);
            expect(tables[0]?.getAttribute('aria-label')).toBe('useApi properties');
            const rows = tables[0]?.querySelectorAll('tbody tr');
            expect(rows?.[0]?.querySelector('td')?.textContent).toContain('path');
            expect(rows?.[0]?.querySelector('td:nth-child(2)')?.textContent).toBe('string');
            expect(rows?.[1]?.querySelector('td:last-child')?.textContent).toBe('[]');
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

it.each(['AreaChart', 'Sankey'] as const)('opens the %s reference with only its supported companions', async (name) => {
    // Arrange
    const user = userEvent.setup();

    await withMounted(<ChartDocumentation name={name} />, async (output) => {
        const propertiesTab = Array.from(output.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
            (tab) => tab.textContent === 'Properties'
        );
        if (!propertiesTab) throw new Error('Expected properties tab');
        expect(output.querySelector('table')).toBeNull();

        // Act
        await act(async () => user.click(propertiesTab));

        // Assert
        const tables = output.querySelectorAll('table');
        expect(tables[0]?.getAttribute('aria-label')).toBe(`${name} properties`);
        expect(tables).toHaveLength(name === 'Sankey' ? 1 : 2);
        if (name === 'AreaChart') {
            expect(tables[1]?.getAttribute('aria-label')).toBe('ChartLegend properties');
        }
    });
});

it('keeps an edited form preview local through code toggles and submission', async () => {
    const user = userEvent.setup();
    const code = 'const retainedPreviewExample = true;';
    const request = vi.fn().mockResolvedValue({});

    await withMounted(
        <RequestContext value={request}>
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
