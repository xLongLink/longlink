import { useApi } from '@/lib/hooks/use-api';
import { zOrganizationSolutionSummary } from '@/lib/generated/platform-api-v1/zod.gen';

/** Loads organization Solutions, refreshing only while a deployment is pending. */
export function useOrganizationSolutions(organizationId: string) {
    return useApi(`/api/v1/organizations/${organizationId}/solutions`, zOrganizationSolutionSummary.array(), {
        refetchInterval: (query) =>
            query.state.data?.some((solution) => solution.status === 'creating' || solution.deployment_pending)
                ? 5000
                : false
    });
}
