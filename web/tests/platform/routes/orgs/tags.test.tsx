// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { membership } from '../../render';
import { useApi } from '@/lib/hooks/use-api';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import userEvent from '@testing-library/user-event';
import TabsSection from '@/platform/routes/orgs/tags';
import { TagForm } from '@/platform/routes/orgs/dialogs/tag-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolutionTags } from '@/platform/routes/orgs/dialogs/solution-tags';
import { zOrganizationTagResponse } from '@/lib/generated/platform-api-v1/zod.gen';

const tags = [
    { id: '00000000-0000-4000-8000-000000000001', name: 'Purchases', icon: 'tag', kind: 'tag' },
    { id: '00000000-0000-4000-8000-000000000002', name: 'Operations', icon: 'wrench', kind: 'tag' },
    { id: '00000000-0000-4000-8000-000000000003', name: 'All Solutions', icon: 'layers', kind: 'all' }
].map((tag) => zOrganizationTagResponse.parse(tag));

/** Connects the section to the same shared query refreshed by tab moves. */
function SharedTabs({ base }: { base: string }) {
    const [rows] = useApi(`${base}/tags`, zOrganizationTagResponse.array());

    return <TabsSection base={base} tags={rows} canMaintain />;
}

it.each([
    { direction: 'up', target: 'Operations', id: tags[1].id, label: 'Move Up' },
    { direction: 'down', target: 'Purchases', id: tags[0].id, label: 'Move Down' }
] as const)('moves a tab $direction and stays pending until the shared order refreshes', async (move) => {
    // Arrange
    const base = `/api/v1/organizations/${membership.organization.id}`;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnMount: false } } });
    client.setQueryData(['api', `${base}/tags`], tags);
    const events = userEvent.setup();
    const requests: { method: string; path: string; body?: unknown }[] = [];
    let finishRefresh: (response: Response) => void = () => undefined;
    const refresh = new Promise<Response>((resolve) => {
        finishRefresh = resolve;
    });
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (request.method === 'POST' && path === `${base}/tags/${move.id}/move`) {
            requests.push({ method: request.method, path, body: await request.json() });
            return new Response(null, { status: 204 });
        }

        if (request.method === 'GET' && path === `${base}/tags`) {
            requests.push({ method: request.method, path });
            return await refresh;
        }

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    try {
        await withMounted(
            <QueryClientProvider client={client}>
                <ApiErrorContext
                    value={(error) => {
                        throw error;
                    }}
                >
                    <SharedTabs base={base} />
                </ApiErrorContext>
            </QueryClientProvider>,
            async (output) => {
                /** Opens a real row menu and returns its requested action. */
                async function action(name: string, label: string) {
                    const trigger = output.querySelector<HTMLButtonElement>(`button[aria-label="Actions for ${name}"]`);

                    if (!trigger) throw new Error(`Expected actions for ${name}`);
                    await act(async () => events.click(trigger));
                    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
                        (item) => item.textContent === label
                    );

                    if (!item) throw new Error(`Expected ${label}`);
                    return item;
                }

                // Act and assert: unavailable boundary moves never issue writes.
                const firstUp = await action('Purchases', 'Move Up');
                expect(firstUp.getAttribute('aria-disabled')).toBe('true');
                await act(async () => events.click(firstUp));
                expect(requests).toEqual([]);
                await act(async () => events.keyboard('{Escape}'));
                const lastDown = await action('All Solutions', 'Move Down');
                expect(lastDown.getAttribute('aria-disabled')).toBe('true');
                await act(async () => events.click(lastDown));
                expect(requests).toEqual([]);
                await act(async () => events.keyboard('{Escape}'));

                const item = await action(move.target, move.label);
                await act(async () => events.click(item));
                await vi.waitFor(() =>
                    expect(requests).toEqual([
                        { method: 'POST', path: `${base}/tags/${move.id}/move`, body: { direction: move.direction } },
                        { method: 'GET', path: `${base}/tags` }
                    ])
                );
                expect([...output.querySelectorAll('tbody tr')].map((row) => row.textContent)).toEqual([
                    'Purchases',
                    'Operations',
                    'All Solutions'
                ]);
                const triggers = [...output.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="menu"]')];
                expect(triggers).toHaveLength(3);
                expect(triggers.every((trigger) => trigger.disabled)).toBe(true);

                await act(async () => finishRefresh(Response.json([tags[1], tags[0], tags[2]])));
                await vi.waitFor(() => expect(triggers.every((trigger) => !trigger.disabled)).toBe(true));
                expect([...output.querySelectorAll('tbody tr')].map((row) => row.textContent)).toEqual([
                    'Operations',
                    'Purchases',
                    'All Solutions'
                ]);
                const newFirstUp = await action('Operations', 'Move Up');
                expect(newFirstUp.getAttribute('aria-disabled')).toBe('true');
            }
        );
    } finally {
        finishRefresh(Response.json(tags));
        transport.mockRestore();
        client.clear();
    }
});

it.each(['create', 'edit'] as const)(
    'validates and retries a %s tab name without losing the draft or icon',
    async (mode) => {
        const writes: unknown[] = [];
        const completed = vi.fn(async () => {});
        const events = userEvent.setup();
        const tag = mode === 'edit' ? tags[1] : null;
        const path = `/api/v1/organizations/${membership.organization.id}/tags`;
        const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
            const request = input instanceof Request ? input : new Request(input, options);

            if (
                request.method !== (mode === 'edit' ? 'PATCH' : 'POST') ||
                new URL(request.url).pathname !== (tag ? `${path}/${tag.id}` : path)
            ) {
                throw new Error(`Unexpected request: ${request.method} ${request.url}`);
            }

            writes.push(await request.json());
            return writes.length === 1
                ? Response.json({ detail: 'Unavailable' }, { status: 503 })
                : new Response(null, { status: 204 });
        });

        try {
            await withMounted(
                <TagForm
                    base={`/api/v1/organizations/${membership.organization.id}`}
                    tag={tag}
                    onSuccess={completed}
                    onOpenChange={() => undefined}
                />,
                async () => {
                    const dialog = document.querySelector('[role="dialog"]');
                    const input = dialog?.querySelector<HTMLInputElement>('input[name="name"]');
                    const submit = dialog?.querySelector<HTMLButtonElement>('button[type="submit"]');

                    if (!input || !submit) throw new Error('Expected the tab name and submit action');
                    expect(input.value).toBe(mode === 'edit' ? 'Operations' : '');

                    // Reject a blank name before issuing any write.
                    await act(async () => {
                        await events.clear(input);
                        await events.click(submit);
                    });
                    expect(input.getAttribute('aria-invalid')).toBe('true');
                    expect(document.activeElement).toBe(input);
                    expect(dialog?.querySelector('[role="alert"]')).not.toBeNull();
                    expect(writes).toEqual([]);
                    expect(completed).not.toHaveBeenCalled();

                    await act(async () => events.type(input, '  Finance  '));
                    if (mode === 'create') {
                        const icon = document.getElementById('tag-icon');

                        if (!icon) throw new Error('Expected the tab icon picker');
                        await act(async () => {
                            await events.clear(icon);
                            await events.type(icon, 'Tools');
                        });
                        const tools = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
                            (option) => option.textContent === 'Tools'
                        );

                        if (!tools) throw new Error('Expected the searched Tools icon');
                        await act(async () => events.click(tools));
                    }
                    await act(async () => events.click(submit));
                    await vi.waitFor(() => expect(dialog?.textContent).toContain('Could not save the tab.'));
                    expect(input.getAttribute('aria-invalid')).toBe('false');
                    expect(input.value).toBe('  Finance  ');
                    const payload = { name: 'Finance', icon: 'wrench' };
                    expect(writes).toEqual([payload]);
                    expect(completed).not.toHaveBeenCalled();

                    // Retry the retained draft through the real footer action.
                    await act(async () => events.click(submit));
                    await vi.waitFor(() => expect(completed).toHaveBeenCalledOnce());
                    expect(writes).toEqual([payload, payload]);
                }
            );
        } finally {
            transport.mockRestore();
        }
    }
);

it.each(['unchanged', 'cleared', 'unknown'] as const)('submits only explicit tag edits: %s', async (edit) => {
    // Arrange an existing assignment and observe only the external write boundary.
    const writes: unknown[] = [];
    const completed = vi.fn();
    const user = userEvent.setup();

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (
            request.method !== 'PATCH' ||
            new URL(request.url).pathname !==
                `/api/v1/organizations/${membership.organization.id}/solutions/00000000-0000-4000-8000-000000000004/tags`
        ) {
            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        }

        writes.push(await request.json());

        return new Response(null, { status: 204 });
    });

    try {
        await withMounted(
            <>
                <SolutionTags
                    base={`/api/v1/organizations/${membership.organization.id}`}
                    tags={tags}
                    solution={{
                        id: '00000000-0000-4000-8000-000000000004',
                        name: 'Purchase approvals',
                        tag_ids:
                            edit === 'unknown' ? [tags[0].id, '00000000-0000-4000-8000-000000000099'] : [tags[0].id]
                    }}
                    onSuccess={async () => {
                        completed();
                    }}
                    onOpenChange={() => undefined}
                />
            </>,
            async () => {
                const dialog = document.querySelector('[role="dialog"]');

                const label = Array.from(dialog?.querySelectorAll('label') ?? []).find(
                    (label) => label.textContent?.trim() === 'Tags'
                );

                const picker = label?.htmlFor ? document.getElementById(label.htmlFor) : null;

                if (!dialog || !(picker instanceof HTMLInputElement)) throw new Error('Expected the tag editor');

                expect(picker.closest('[data-slot="combobox-chips"]')?.textContent).toContain('Purchases');
                if (edit === 'unknown') {
                    expect(picker.closest('[data-slot="combobox-chips"]')?.textContent).toContain(
                        '00000000-0000-4000-8000-000000000099'
                    );
                }

                // Edit through the real picker so the controlled selection reaches the write.
                if (edit === 'unknown') {
                    await act(async () => user.click(picker));
                    const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
                    const operations = options.find((option) => option.textContent?.includes('Operations'));

                    if (!operations) throw new Error('Expected the Operations option');

                    expect(options.some((option) => option.textContent?.includes('All Solutions'))).toBe(false);
                    await act(async () => user.click(operations));
                    await act(async () => user.keyboard('{Escape}'));
                }

                if (edit === 'cleared') {
                    const clear = dialog.querySelector<HTMLButtonElement>('button[data-slot="combobox-chip-remove"]');

                    if (!clear) throw new Error('Expected the clear selection action');

                    await act(async () => clear.click());
                    expect(picker.placeholder).toBe('Select tags');
                    expect(dialog.querySelector('[data-slot="combobox-chip"]')).toBeNull();
                }

                expect(writes).toEqual([]);

                const form = dialog.querySelector('form');
                const submit = dialog?.querySelector<HTMLButtonElement>('button[type="submit"]');

                if (!form || !submit) throw new Error('Expected the tag form');

                await act(async () => form.requestSubmit(submit));
                await vi.waitFor(() => expect(completed).toHaveBeenCalledOnce());
                expect(writes).toEqual([
                    {
                        tag_ids:
                            edit === 'cleared'
                                ? []
                                : edit === 'unknown'
                                  ? [tags[0].id, '00000000-0000-4000-8000-000000000099', tags[1].id]
                                  : [tags[0].id]
                    }
                ]);
            }
        );
    } finally {
        transport.mockRestore();
    }
});
