import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import type { Props } from '@/xml/types';
import { useXmlRuntime } from '@/xml/core/context';
import { resolveXmlProps } from '@/xml/core/props';
import { Button } from '@astryxdesign/core/Button';
import UpdateSolution from '@/components/dialogs/UpdateSolution';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationSolutionsKey } from '@/lib/hooks/use-organization';
import { zOrganizationSolutionSummary, zSolutionUpdateCheck } from '@/lib/generated/platform-api-v1/zod.gen';

const solutionUpdatePropsSchema = z.object({ organizationId: z.string().uuid(), solution: z.unknown() });

/** Owns a Solution revision workflow rendered from an XML table row. */
export function SolutionUpdate({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { organizationId, solution: value } = resolveXmlProps(props, ctx, solutionUpdatePropsSchema, ['solution']);
    const solution = zOrganizationSolutionSummary.parse(value);
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Scope on-demand reviews to the desired revision and deployment lifecycle.
    const queryKey = [
        'api',
        'release-review',
        solution.id,
        solution.desired_revision_id,
        solution.deployment_pending,
        solution.status,
    ];
    const inspection = useQuery({
        queryKey,
        queryFn: async ({ signal }) =>
            zSolutionUpdateCheck.parse(
                await api(`/api/v1/solutions/${solution.id}/update`, { signal, timeout: 25000 }).json()
            ),
        enabled: false,
        retry: false,
        gcTime: 0,
    });
    const candidate = inspection.isSuccess ? inspection.data : undefined;
    const updateAvailable = candidate ? candidate.metadata.image !== candidate.current_image : false;

    /** Discards reviewed metadata after deployment or a stale-source conflict. */
    async function resetReview() {
        setIsOpen(false);
        await queryClient.resetQueries({ queryKey, exact: true });
        await queryClient.invalidateQueries({ queryKey: organizationSolutionsKey(organizationId) });
    }

    return (
        <>
            <Button
                label={candidate ? (updateAvailable ? 'Update' : 'Configure') : 'Check for updates'}
                size="sm"
                isLoading={inspection.isFetching}
                isDisabled={
                    solution.desired_revision_id === null ||
                    solution.deployment_pending ||
                    solution.status === 'creating'
                }
                clickAction={async () => {
                    if (candidate) {
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
