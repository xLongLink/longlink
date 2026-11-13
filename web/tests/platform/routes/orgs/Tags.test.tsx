// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import * as icons from '@/lib/icons';
import { it, expect, vi } from 'vitest';
import { membership } from '../../render';
import { withMounted } from '../../../render';
import { SolutionTags } from '@/platform/routes/orgs/Tags';
import { IconRequestContext } from '@/components/ui/contexts';
import { zOrganizationTagResponse } from '@/lib/generated/platform-api-v1/zod.gen';

const tags = [
    { id: '00000000-0000-4000-8000-000000000001', name: 'Purchases', icon: 'tag', kind: 'tag' },
    { id: '00000000-0000-4000-8000-000000000002', name: 'Operations', icon: 'wrench', kind: 'tag' },
    { id: '00000000-0000-4000-8000-000000000003', name: 'All Solutions', icon: 'layers', kind: 'all' }
].map((tag) => zOrganizationTagResponse.parse(tag));

it.each(['unchanged', 'changed', 'cleared', 'cancel'] as const)('submits only explicit tag edits: %s', async (edit) => {
    // Arrange an existing assignment and observe only the external write boundary.
    const writes: unknown[] = [];
    const completed = vi.fn();
    const close = vi.fn();

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
            <IconRequestContext value={icons.load}>
                <SolutionTags
                    base={`/api/v1/organizations/${membership.organization.id}`}
                    tags={tags}
                    solution={{
                        id: '00000000-0000-4000-8000-000000000004',
                        name: 'Purchase approvals',
                        tag_ids: [tags[0].id]
                    }}
                    onSuccess={async () => {
                        completed();
                    }}
                    onClose={close}
                />
            </IconRequestContext>,
            async () => {
                const dialog = document.querySelector('[role="dialog"]');

                const label = Array.from(dialog?.querySelectorAll('label') ?? []).find(
                    (label) => label.textContent?.trim() === 'Tags'
                );

                const picker = label?.htmlFor ? document.getElementById(label.htmlFor) : null;

                if (!dialog || !(picker instanceof HTMLButtonElement)) throw new Error('Expected the tag editor');

                expect(picker.textContent).toContain('Purchases');

                // Edit through the real picker so its hidden form carriers stay in the contract.
                if (edit === 'changed') {
                    await act(async () => picker.click());
                    const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
                    const operations = options.find((option) => option.textContent?.includes('Operations'));

                    if (!operations) throw new Error('Expected the Operations option');

                    expect(options.some((option) => option.textContent?.includes('All Solutions'))).toBe(false);
                    await act(async () => operations.click());
                    await act(async () => picker.click());
                }

                if (edit === 'cleared') {
                    const clear = dialog.querySelector<HTMLButtonElement>('button[aria-label^="Clear"]');

                    if (!clear) throw new Error('Expected the clear selection action');

                    await act(async () => clear.click());
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
                const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');

                if (!form || !submit) throw new Error('Expected the tag form');

                await act(async () => form.requestSubmit(submit));
                await vi.waitFor(() => expect(completed).toHaveBeenCalledOnce());
                expect(writes).toEqual([
                    { tag_ids: edit === 'cleared' ? [] : edit === 'changed' ? [tags[0].id, tags[1].id] : [tags[0].id] }
                ]);
            }
        );
    } finally {
        transport.mockRestore();
    }
});
