// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { membership } from '../../render';
import { withMounted } from '../../../render';
import userEvent from '@testing-library/user-event';
import { TagForm } from '@/components/dialogs/tag-form';
import { SolutionTags } from '@/components/dialogs/solution-tags';
import { zOrganizationTagResponse } from '@/lib/generated/platform-api-v1/zod.gen';

const tags = [
    { id: '00000000-0000-4000-8000-000000000001', name: 'Purchases', icon: 'tag', kind: 'tag' },
    { id: '00000000-0000-4000-8000-000000000002', name: 'Operations', icon: 'wrench', kind: 'tag' },
    { id: '00000000-0000-4000-8000-000000000003', name: 'All Solutions', icon: 'layers', kind: 'all' }
].map((tag) => zOrganizationTagResponse.parse(tag));

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
                    const submit = dialog?.querySelector<HTMLButtonElement>(
                        '[data-slot="dialog-footer"] button[type="submit"]'
                    );

                    if (!input || !submit) throw new Error('Expected the tab name and footer submit action');
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

                    await act(async () => {
                        await events.type(input, '  Finance  ');
                        await events.click(submit);
                    });
                    await vi.waitFor(() => expect(dialog?.textContent).toContain('Could not save the tab.'));
                    expect(input.getAttribute('aria-invalid')).toBe('false');
                    expect(input.value).toBe('  Finance  ');
                    expect(writes).toEqual([{ name: 'Finance', icon: mode === 'edit' ? 'wrench' : 'tag' }]);
                    expect(completed).not.toHaveBeenCalled();

                    // Retry the retained draft through the real footer action.
                    await act(async () => events.click(submit));
                    await vi.waitFor(() => expect(completed).toHaveBeenCalledOnce());
                    expect(writes).toEqual([
                        { name: 'Finance', icon: mode === 'edit' ? 'wrench' : 'tag' },
                        { name: 'Finance', icon: mode === 'edit' ? 'wrench' : 'tag' }
                    ]);
                }
            );
        } finally {
            transport.mockRestore();
        }
    }
);

it.each(['unchanged', 'changed', 'cleared', 'cancel', 'unknown'] as const)(
    'submits only explicit tag edits: %s',
    async (edit) => {
        // Arrange an existing assignment and observe only the external write boundary.
        const writes: unknown[] = [];
        const completed = vi.fn();
        const close = vi.fn();
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
                        onOpenChange={close}
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
                    if (edit === 'changed' || edit === 'unknown') {
                        await act(async () => user.click(picker));
                        const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
                        const operations = options.find((option) => option.textContent?.includes('Operations'));

                        if (!operations) throw new Error('Expected the Operations option');

                        expect(options.some((option) => option.textContent?.includes('All Solutions'))).toBe(false);
                        await act(async () => user.click(operations));
                        await act(async () => user.keyboard('{Escape}'));
                    }

                    if (edit === 'cleared') {
                        const clear = dialog.querySelector<HTMLButtonElement>(
                            'button[data-slot="combobox-chip-remove"]'
                        );

                        if (!clear) throw new Error('Expected the clear selection action');

                        await act(async () => clear.click());
                        expect(picker.placeholder).toBe('Select tags');
                        expect(dialog.querySelector('[data-slot="combobox-chip"]')).toBeNull();
                    }

                    expect(writes).toEqual([]);

                    // Cancel must never write, while submission must include the complete selection.
                    if (edit === 'cancel') {
                        const cancel = Array.from(dialog.querySelectorAll('button')).find(
                            (button) => button.textContent === 'Cancel'
                        );

                        if (!cancel) throw new Error('Expected the cancel action');

                        await act(async () => cancel.click());
                        expect(close).toHaveBeenCalledOnce();
                        expect(writes).toEqual([]);
                        expect(completed).not.toHaveBeenCalled();

                        return;
                    }

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
                                      : edit === 'changed'
                                        ? [tags[0].id, tags[1].id]
                                        : [tags[0].id]
                        }
                    ]);
                }
            );
        } finally {
            transport.mockRestore();
        }
    }
);
