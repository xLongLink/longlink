import SolutionSettings from './solution-settings';
import { SolutionOverview } from './solution-overview';
import { useSelection } from '@/lib/hooks/use-selection';
import type { OrganizationContext } from '@/platform/layouts/organization';
import CreateSolution from '@/platform/routes/orgs/dialogs/create-solution';
import { useOrganizationSolutions } from '@/platform/hooks/use-organization-solutions';

/** Shares Solution loading across overview and settings. */
export default function SolutionManagement({
    membership,
    presentation
}: {
    membership: OrganizationContext;
    presentation: 'overview' | 'settings';
}) {
    const [solutions, invalidateSolutions] = useOrganizationSolutions(membership.organization.id);

    return presentation === 'overview' ? (
        <OverviewManagement membership={membership} solutions={solutions} invalidateSolutions={invalidateSolutions} />
    ) : (
        <SolutionSettings membership={membership} solutions={solutions} invalidateSolutions={invalidateSolutions} />
    );
}

/** Owns creation only while the overview is active. */
function OverviewManagement({
    membership,
    solutions,
    invalidateSolutions
}: {
    membership: OrganizationContext;
    solutions: ReturnType<typeof useOrganizationSolutions>[0];
    invalidateSolutions: () => Promise<void>;
}) {
    const [creation, setCreation, closeCreation] = useSelection<{ kind: 'create' }>();

    function openCreate() {
        setCreation((current) => current ?? { kind: 'create' });
    }

    async function onSuccess() {
        await invalidateSolutions();
        closeCreation();
    }

    return (
        <>
            <SolutionOverview membership={membership} solutions={solutions} openCreate={openCreate} />
            {creation && (
                <CreateSolution
                    organizationId={membership.organization.id}
                    onSuccess={onSuccess}
                    onOpenChange={closeCreation}
                />
            )}
        </>
    );
}
