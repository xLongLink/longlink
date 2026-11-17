// @vitest-environment happy-dom
import { act } from 'react';
import { expect, it, vi } from 'vitest';
import { withMounted } from '../../../render';
import { membership, user } from '../../render';
import userEvent from '@testing-library/user-event';
import { useQueryClient } from '@tanstack/react-query';
import Solutions from '@/platform/routes/admin/solutions';
import { ApiProvider, ApiBoundary } from '@/components/api';
import { AuthenticatedUserContext } from '@/lib/hooks/use-user';
import Organizations from '@/platform/routes/admin/organizations';
import { zSolutionResponse } from '@/lib/generated/platform-api-v1/zod.gen';

const organization = membership.organization;
const solution = zSolutionResponse.parse({
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Orders',
    description: null,
    status: 'running',
    deployment_pending: false,
    desired_revision_id: null,
    deployed_revision_id: null,
    organization,
    image_desired: 'registry.example.com/orders:latest',
    created_at: '2026-10-16T12:00:00Z'
});

function Refresh() {
    const client = useQueryClient();

    return <button onClick={() => void client.invalidateQueries({ queryKey: ['api'] })}>Refresh rows</button>;
}

for (const { name, Page, item } of [
    { name: 'organizations', Page: Organizations, item: organization },
    { name: 'solutions', Page: Solutions, item: solution }
]) {
    it(`forgets missing ${name} metadata but retains a captured deletion identity`, async () => {
        const actor = userEvent.setup();
        let present = true;

        const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
            const request = input instanceof Request ? input : new Request(input, options);
            expect(new URL(request.url).pathname).toBe(`/api/v1/${name}`);

            return Response.json({ items: present ? [item] : [], total: present ? 1 : 0 });
        });

        try {
            await withMounted(
                <AuthenticatedUserContext value={{ ...user, administrator: true }}>
                    <ApiProvider>
                        <Refresh />
                        <ApiBoundary>
                            <Page />
                        </ApiBoundary>
                    </ApiProvider>
                </AuthenticatedUserContext>,
                async (output) => {
                    await vi.waitFor(() => expect(output.querySelector('tbody')?.textContent).toContain(item.name));
                    const metadata = [...output.querySelectorAll('button')].find(
                        (button) => button.textContent === 'Metadata'
                    );
                    const refresh = [...output.querySelectorAll('button')].find(
                        (button) => button.textContent === 'Refresh rows'
                    );

                    if (!metadata || !refresh) throw new Error('Expected metadata and refresh actions');
                    await act(async () => actor.click(metadata));
                    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(item.id);

                    present = false;
                    await act(async () => actor.click(refresh));
                    await vi.waitFor(() => expect(output.querySelector('tbody')?.textContent).not.toContain(item.name));
                    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());

                    present = true;
                    await act(async () => actor.click(refresh));
                    await vi.waitFor(() => expect(output.querySelector('tbody')?.textContent).toContain(item.name));
                    expect(document.querySelector('[role="dialog"]')).toBeNull();
                    expect(document.querySelector('[role="alertdialog"]')).toBeNull();

                    const restoredMetadata = [...output.querySelectorAll('button')].find(
                        (button) => button.textContent === 'Metadata'
                    );

                    if (!restoredMetadata) throw new Error('Expected restored metadata action');
                    await act(async () => actor.click(restoredMetadata));
                    const begin = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
                        (button) => button.textContent === 'Delete'
                    );

                    if (!begin) throw new Error('Expected metadata deletion action');
                    await act(async () => actor.click(begin));
                    present = false;
                    await act(async () => actor.click(refresh));
                    await vi.waitFor(() => expect(output.querySelector('tbody')?.textContent).not.toContain(item.name));
                    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(item.name);
                },
                `/admin/${name}`
            );
        } finally {
            transport.mockRestore();
        }
    });

    it(`recovers from a failed ${name} deletion without losing the resource or reporting false success`, async () => {
        const actor = userEvent.setup();
        const deletions: string[] = [];
        let present = true;

        const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
            const request = input instanceof Request ? input : new Request(input, options);
            const path = new URL(request.url).pathname;

            if (request.method === 'DELETE') {
                deletions.push(path);
                if (deletions.length === 1) return Response.json({ detail: 'Deletion unavailable' }, { status: 503 });
                present = false;

                return new Response(null, { status: 204 });
            }

            expect(path).toBe(`/api/v1/${name}`);

            return Response.json({ items: present ? [item] : [], total: present ? 1 : 0 });
        });

        try {
            await withMounted(
                <AuthenticatedUserContext value={{ ...user, administrator: true }}>
                    <ApiProvider>
                        <ApiBoundary>
                            <Page />
                        </ApiBoundary>
                    </ApiProvider>
                </AuthenticatedUserContext>,
                async (output) => {
                    for (const attempt of [1, 2]) {
                        await vi.waitFor(() => expect(output.querySelector('tbody')?.textContent).toContain(item.name));
                        const metadata = [...output.querySelectorAll('button')].find(
                            (button) => button.textContent === 'Metadata'
                        );

                        if (!metadata) throw new Error('Expected metadata action');
                        await act(async () => actor.click(metadata));
                        const begin = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
                            (button) => button.textContent === 'Delete'
                        );

                        if (!begin) throw new Error('Expected metadata deletion action');
                        await act(async () => actor.click(begin));
                        expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(item.name);
                        const confirm = [
                            ...document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')
                        ].find((button) => button.textContent === 'Delete');

                        if (!confirm) throw new Error('Expected deletion confirmation');
                        await act(async () => actor.click(confirm));

                        if (attempt === 1) {
                            await vi.waitFor(() => expect(output.textContent).toContain('Unable to load this page.'));
                            expect(present).toBe(true);
                            const retry = [...output.querySelectorAll('button')].find(
                                (button) => button.textContent === 'Retry'
                            );

                            if (!retry) throw new Error('Expected error recovery action');
                            await act(async () => actor.click(retry));
                        }
                    }

                    await vi.waitFor(() => expect(output.querySelector('tbody')?.textContent).not.toContain(item.name));
                    await vi.waitFor(() => expect(document.querySelector('[role="alertdialog"]')).toBeNull());
                    expect(present).toBe(false);
                    expect(deletions).toEqual([`/api/v1/${name}/${item.id}`, `/api/v1/${name}/${item.id}`]);
                },
                `/admin/${name}`
            );
        } finally {
            transport.mockRestore();
        }
    });
}
