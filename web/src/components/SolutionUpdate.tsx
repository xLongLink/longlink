import { api } from '@/lib/api';
import { useState } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@astryxdesign/core/Button';
import UpdateSolution from '@/components/dialogs/UpdateSolution';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zSolutionUpdateCheck } from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationSolutionSummary } from '@/lib/generated/platform-api-v1/types.gen';

/** Own the on-demand source check and reuse its candidate in the environment dialog. */
export default function SolutionUpdate({
    solution,
    organizationId,
}: {
    solution: OrganizationSolutionSummary;
    organizationId: string;
}) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Scope on-demand reviews to the desired revision and deployment lifecycle.
    const queryKey = [
        'release-review',
        solution.id,
        solution.desired_revision_id,
        solution.deployment_pending,
        solution.status,
    ];
    const inspection = useQuery({
        queryKey,
        queryFn: async ({ signal }) => {
            try {
                return zSolutionUpdateCheck.parse(
                    await api(`/api/v1/solutions/${solution.id}/update`, { signal, timeout: 25000 }).json()
                );
            } catch (failure) {
                if (!signal.aborted) {
                    toast({
                        body: failure instanceof Error ? failure.message : 'Failed to check for updates',
                        type: 'error',
                    });
                }
                throw failure;
            }
        },
        enabled: false,
        retry: false,
        gcTime: 0,
    });
    const candidate = inspection.isSuccess ? inspection.data : undefined;

    /** Discard reviewed metadata after deployment or a stale-source conflict. */
    async function resetReview() {
        setIsOpen(false);
        await queryClient.resetQueries({ queryKey, exact: true });
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}/solutions`] }),
            queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/solutions'] }),
        ]);
    }

    return (
        <>
            <Button
                label={candidate ? (candidate.available ? 'Update' : 'Up to Date') : 'Check for updates'}
                size="sm"
                isLoading={inspection.isFetching}
                isDisabled={
                    solution.desired_revision_id === null ||
                    solution.deployment_pending ||
                    solution.status === 'creating'
                }
                clickAction={async () => {
                    if (candidate?.available) {
                        setIsOpen(true);
                    } else {
                        await inspection.refetch();
                    }
                }}
            />
            {isOpen && candidate ? (
                <UpdateSolution
                    solution={solution}
                    candidate={candidate}
                    onClose={() => setIsOpen(false)}
                    onInvalidate={resetReview}
                />
            ) : null}
        </>
    );
}
