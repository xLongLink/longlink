// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import Usage from '@/platform/routes/orgs/usage';
import userEvent from '@testing-library/user-event';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

it('edits independent pools atomically, validates steps, and preserves failed edits for retry', async () => {
    // Arrange
    const base = '/api/v1/organizations/00000000-0000-4000-8000-000000000002';
    const usage = schemas.zOrganizationUsage.parse({
        users: 1,
        status: 'running',
        solutions: 1,
        stripe_enabled: true,
        has_payment_method: true,
        compute_cpu_millicores: 1000,
        compute_ram_bytes: 1073741824,
        storage_bytes: 10737418240,
        database_cpu_millicores: 1000,
        database_ram_bytes: 1073741825,
        database_storage_bytes: 1073741824
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } });
    client.setQueryData(['api', `${base}/usage`], usage);
    client.setQueryData(['api', `${base}/storage`], { space_used: 1073741824, quota_bytes: 10737418240 });
    client.setQueryData(['api', `${base}/database`], { space_used: 536870912, quota_bytes: 1073741824 });
    const requests: unknown[] = [];
    const reportError = vi.fn();
    let releaseFailure: ((response: Response) => void) | undefined;
    let releaseRefresh: ((response: Response) => void) | undefined;
    let saved = usage;
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        if (new URL(request.url).pathname !== `${base}/usage`) throw new Error('Unexpected request');
        if (request.method === 'GET') {
            if (requests.length === 2) {
                return await new Promise<Response>((resolve) => {
                    releaseRefresh = resolve;
                });
            }
            return Response.json(saved);
        }
        if (request.method !== 'PATCH') throw new Error('Unexpected method');
        const json = schemas.zOrganizationUsageUpdate.parse(await request.json());
        requests.push(json);
        if (requests.length === 1) {
            return await new Promise<Response>((resolve) => {
                releaseFailure = resolve;
            });
        }
        saved = { ...saved, ...json };
        return new Response(null, { status: 204 });
    });
    const events = userEvent.setup();

    try {
        await withMounted(
            <QueryClientProvider client={client}>
                <ApiErrorContext value={reportError}>
                    <Usage base={base} canManage />
                </ApiErrorContext>
            </QueryClientProvider>,
            async (output) => {
                const cards = Array.from(output.querySelectorAll('[data-slot="card"]'));
                const compute = cards.find((card) => card.textContent?.includes('Compute'));
                const database = cards.find((card) => card.textContent?.includes('Database'));
                const storage = cards.find((card) => card.textContent?.includes('Files'));
                const edit = compute?.querySelector('button');
                if (!edit) throw new Error('Expected compute editor');
                expect(compute?.textContent).toContain('- / 1 vCPU');
                expect(database?.textContent).toContain('0.5 / 1 GiB');
                expect(storage?.textContent).toContain('1 / 10 GiB');

                // Act
                await act(async () => edit.click());
                const dialog = document.querySelector('[role="dialog"]');
                const cpu = dialog?.querySelector<HTMLInputElement>('#capacity-compute_cpu');
                const ram = dialog?.querySelector<HTMLInputElement>('#capacity-compute_ram');
                const save = dialog?.querySelector<HTMLButtonElement>('button[type="submit"]');
                if (!cpu || !ram || !save) throw new Error('Expected compute fields');
                expect(dialog?.querySelectorAll('input')).toHaveLength(2);
                await act(async () => {
                    await events.clear(cpu);
                    await events.type(cpu, '0.3');
                    save.click();
                });

                // Assert
                await vi.waitFor(() => expect(dialog?.textContent).toContain('Enter CPU in increments of 0.25 vCPU.'));
                expect(requests).toEqual([]);
                await act(async () => {
                    await events.clear(cpu);
                    await events.type(cpu, '0.5');
                    await events.clear(ram);
                    await events.type(ram, '192');
                    save.click();
                });
                await vi.waitFor(() => expect(dialog?.textContent).toContain('Minimum 256 MiB.'));
                await act(async () => {
                    await events.clear(ram);
                    await events.type(ram, '257');
                    save.click();
                });
                await vi.waitFor(() => expect(dialog?.textContent).toContain('Enter RAM in increments of 64 MiB.'));
                await act(async () => {
                    await events.clear(ram);
                    await events.type(ram, '256');
                    save.click();
                });
                await vi.waitFor(() => expect(requests).toHaveLength(1));
                expect(save.disabled).toBe(true);
                expect(dialog?.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
                const cancel = Array.from(dialog?.querySelectorAll('button') ?? []).find(
                    (button) => button.textContent === 'Cancel'
                );
                await act(async () => cancel?.click());
                expect(document.querySelector('[role="dialog"]')).toBe(dialog);
                await act(async () => releaseFailure?.(Response.json({ detail: 'Unavailable' }, { status: 503 })));
                await vi.waitFor(() => expect(dialog?.textContent).toContain('Unavailable'));
                expect(cpu.value).toBe('0.5');
                expect(reportError).toHaveBeenCalledOnce();
                saved = { ...saved, compute_cpu_millicores: 2000, storage_bytes: 21474836480 };
                await act(async () => {
                    client.setQueryData(['api', `${base}/usage`], saved);
                });
                await vi.waitFor(() => expect(compute?.textContent).toContain('- / 2 vCPU'));
                expect(cpu.value).toBe('0.5');
                await act(async () => save.click());
                await vi.waitFor(() => expect(releaseRefresh).toBeTypeOf('function'));
                expect(document.querySelector('[role="dialog"]')).toBe(dialog);
                expect(save.disabled).toBe(true);
                await act(async () => releaseRefresh?.(Response.json(saved)));
                await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
                const computeUpdate = {
                    compute_cpu_millicores: 500,
                    compute_ram_bytes: 268435456,
                    storage_bytes: saved.storage_bytes,
                    database_cpu_millicores: usage.database_cpu_millicores,
                    database_ram_bytes: usage.database_ram_bytes,
                    database_storage_bytes: usage.database_storage_bytes
                };
                expect(requests).toEqual([{ ...computeUpdate, storage_bytes: usage.storage_bytes }, computeUpdate]);

                const editDatabase = database?.querySelector('button');
                if (!editDatabase) throw new Error('Expected database editor');
                await act(async () => editDatabase.click());
                const databaseDialog = document.querySelector('[role="dialog"]');
                const databaseCpu = databaseDialog?.querySelector<HTMLInputElement>('#capacity-database_cpu');
                const databaseRam = databaseDialog?.querySelector<HTMLInputElement>('#capacity-database_ram');
                const databaseDisk = databaseDialog?.querySelector<HTMLInputElement>('#capacity-database_storage');
                const saveDatabase = databaseDialog?.querySelector<HTMLButtonElement>('button[type="submit"]');
                if (!databaseCpu || !databaseRam || !databaseDisk || !saveDatabase) {
                    throw new Error('Expected database fields');
                }
                expect(databaseRam.value).toBe('1088');
                expect(databaseCpu.max).toBe('');
                expect(databaseDialog?.querySelector('input[type="range"]')).toBeNull();
                await act(async () => {
                    await events.clear(databaseCpu);
                    await events.type(databaseCpu, '4');
                    await events.clear(databaseRam);
                    await events.type(databaseRam, '2048');
                    await events.clear(databaseDisk);
                    await events.type(databaseDisk, '20');
                    saveDatabase.click();
                });
                await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
                expect(requests[2]).toEqual({
                    ...computeUpdate,
                    database_cpu_millicores: 4000,
                    database_ram_bytes: 2147483648,
                    database_storage_bytes: 21474836480
                });

                const editStorage = storage?.querySelector('button');
                if (!editStorage) throw new Error('Expected storage editor');
                await act(async () => editStorage.click());
                const storageDialog = document.querySelector('[role="dialog"]');
                const files = storageDialog?.querySelector<HTMLInputElement>('#capacity-storage_storage');
                const saveStorage = storageDialog?.querySelector<HTMLButtonElement>('button[type="submit"]');
                if (!files || !saveStorage) throw new Error('Expected file capacity field');
                expect(storageDialog?.querySelectorAll('input')).toHaveLength(1);
                expect(files.min).toBe('1');
                await act(async () => {
                    await events.clear(files);
                    await events.type(files, '0');
                    saveStorage.click();
                });
                await vi.waitFor(() => expect(storageDialog?.textContent).toContain('Minimum 1 GiB.'));
                expect(requests).toHaveLength(3);
                await act(async () => {
                    await events.clear(files);
                    await events.type(files, '2.1');
                    saveStorage.click();
                });
                await vi.waitFor(() => expect(storageDialog?.textContent).toContain('increments of 1 GiB'));
                await act(async () => {
                    await events.tab();
                });
                expect(files.value).toBe('3');
                await act(async () => saveStorage.click());
                await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
                expect(requests[3]).toEqual({
                    ...computeUpdate,
                    storage_bytes: 3221225472,
                    database_cpu_millicores: 4000,
                    database_ram_bytes: 2147483648,
                    database_storage_bytes: 21474836480
                });
            }
        );
    } finally {
        transport.mockRestore();
        client.clear();
    }
});

it('keeps database editing available with failed metrics and cancels without saving', async () => {
    // Arrange
    const base = '/api/v1/organizations/00000000-0000-4000-8000-000000000002';
    const usage = schemas.zOrganizationUsage.parse({
        users: 1,
        status: 'running',
        solutions: 1,
        stripe_enabled: true,
        has_payment_method: false,
        compute_cpu_millicores: 1000,
        compute_ram_bytes: 1073741824,
        storage_bytes: 1073741824,
        database_cpu_millicores: 1000,
        database_ram_bytes: 1073741824,
        database_storage_bytes: 1073741824
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } });
    client.setQueryData(['api', `${base}/usage`], usage);
    let metricsAvailable = false;
    const patches = vi.fn();
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        if (request.method === 'PATCH') patches();
        return metricsAvailable
            ? Response.json({ space_used: 0, quota_bytes: 1073741824 })
            : Response.json({ detail: 'Metrics unavailable' }, { status: 503 });
    });
    try {
        await withMounted(
            <QueryClientProvider client={client}>
                <ApiErrorContext value={() => {}}>
                    <Usage base={base} canManage />
                </ApiErrorContext>
            </QueryClientProvider>,
            async (output) => {
                await vi.waitFor(() => expect(output.textContent).toContain('Database usage unavailable.'));
                const edit = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Edit'
                );
                if (!edit) throw new Error('Expected database editor');

                // Act
                await act(async () => edit.click());
                const dialog = document.querySelector('[role="dialog"]');
                const cpu = dialog?.querySelector<HTMLInputElement>('#capacity-database_cpu');
                if (!cpu) throw new Error('Expected database CPU field');
                const events = userEvent.setup();
                await act(async () => {
                    await events.clear(cpu);
                    await events.type(cpu, '4');
                });
                const cancel = Array.from(dialog?.querySelectorAll('button') ?? []).find(
                    (button) => button.textContent === 'Cancel'
                );
                await act(async () => cancel?.click());
                await act(async () => edit.click());
                expect(document.querySelector<HTMLInputElement>('#capacity-database_cpu')?.value).toBe('1');
                const reopenedCancel = Array.from(
                    document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')
                ).find((button) => button.textContent === 'Cancel');
                await act(async () => reopenedCancel?.click());
                metricsAvailable = true;
                const retry = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Retry database usage'
                );
                await act(async () => retry?.click());

                // Assert
                await vi.waitFor(() => expect(output.textContent).not.toContain('Database usage unavailable.'));
                expect(document.querySelector('[role="dialog"]')).toBeNull();
                expect(patches).not.toHaveBeenCalled();
                expect(client.getQueryData(['api', `${base}/usage`])).toEqual(usage);
            }
        );
    } finally {
        transport.mockRestore();
        client.clear();
    }
});
