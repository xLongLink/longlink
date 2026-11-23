import { useParams } from 'react-router';
import { useApi } from '@/lib/hooks/use-api';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SolutionPage } from '@/views/host/solution-page';
import { PublicAccount } from '@/components/ui/public-account';
import { zPublicSolution } from '@/lib/generated/platform-api-v1/zod.gen';

/** Reads public metadata independently of organization membership. */
export default function PublicSolution() {
    const { solution: solutionId = '' } = useParams();
    const [solution] = useApi(`/api/v1/public/solutions/${encodeURIComponent(solutionId)}`, zPublicSolution);

    return (
        <SolutionPage
            key={solutionId}
            action={<PublicAccount />}
            breadcrumb={
                <Breadcrumbs items={[{ label: 'Solutions', href: '/explore/solutions' }, { label: solution.name }]} />
            }
            formatTitle={(title) => `${title ?? solution.name} | LongLink`}
            navigationBaseUrl={`/explore/solutions/${solution.id}`}
            viewsUrl={`/api/v1/public/solutions/${solution.id}/proxy/views.json`}
        />
    );
}
