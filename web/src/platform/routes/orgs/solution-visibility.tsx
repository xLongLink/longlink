import { api } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { Switch } from '@/components/shadcn/switch';
import { isPublicSolutionQuery } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';

/** Publishes or revokes anonymous read access without optimistic permission changes. */
export function SolutionVisibility({
    solution,
    invalidate
}: {
    solution: { id: string; name: string; public: boolean };
    invalidate: () => Promise<void>;
}) {
    const client = useQueryClient();
    const reportError = useApiError();
    const confirmation = useConfirm();
    const mutation = useMutation({
        mutationFn: async (isPublic: boolean) => {
            await api.patch(`/api/v1/solutions/${solution.id}/visibility`, { json: { public: isPublic } });
        },
        onSuccess: async () => {
            await Promise.all([invalidate(), client.invalidateQueries({ predicate: isPublicSolutionQuery })]);
        },
        onError: reportError
    });

    return (
        <>
            <label className="inline-flex items-center gap-2 text-sm">
                <Switch
                    size="sm"
                    checked={solution.public}
                    disabled={mutation.isPending}
                    aria-label={`Public access for ${solution.name}`}
                    onCheckedChange={(isPublic) => {
                        if (!isPublic) {
                            mutation.mutate(false);

                            return;
                        }

                        confirmation.show({
                            title: 'Make solution public',
                            description: `Anyone can discover ${solution.name} and read its live data without signing in.`,
                            actionLabel: 'Make public',
                            onAction: async () => {
                                await mutation.mutateAsync(true);
                            }
                        });
                    }}
                />
                {solution.public ? 'Public' : 'Private'}
            </label>
            {confirmation.element}
        </>
    );
}
