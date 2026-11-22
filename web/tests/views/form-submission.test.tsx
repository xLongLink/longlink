// @vitest-environment happy-dom
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import type { ContextType } from 'react';
import { ApiErrorContext } from '@/lib/errors';
import { ReportedError } from '@/lib/reported';
import { RequestContext } from '@/lib/view-capabilities';
import { useForm } from '@/components/longlink/hooks/use-form';

it.each([
    { cause: new ReportedError('Unavailable'), reports: 0 },
    { cause: 'Unavailable', reports: 1 }
])(
    'reports write failures appropriately and permits retry when onError throws ($cause)',
    async ({ cause, reports }) => {
        // Arrange
        const request = vi
            .fn<NonNullable<ContextType<typeof RequestContext>>['request']>()
            .mockRejectedValueOnce(cause)
            .mockResolvedValue(null);
        const reportError = vi.fn();
        const callbackError = new Error('Callback failed');
        const onError = vi.fn(async (_error: Error) => {
            throw callbackError;
        });
        let submit: ((data: FormData) => Promise<void>) | undefined;

        function Example() {
            submit = useForm('/api/tasks', { onError }).submit;
            return null;
        }

        await withMounted(
            <ApiErrorContext value={reportError}>
                <RequestContext value={{ request }}>
                    <Example />
                </RequestContext>
            </ApiErrorContext>,
            async () => {
                if (!submit) throw new Error('Expected form submission');

                // Act
                await expect(submit(new FormData())).rejects.toBe(callbackError);
                await expect(submit(new FormData())).resolves.toBeUndefined();

                // Assert
                expect(request).toHaveBeenCalledTimes(2);
                expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
                expect(reportError).toHaveBeenCalledTimes(reports);
            }
        );
    }
);
