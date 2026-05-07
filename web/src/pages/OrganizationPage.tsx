import { useApiData } from '@/hooks/use-data';
import { useSearchParams } from 'react-router';
import View from './View';

type OrganizationPageProps = {
    page?: string;
};

/**
 * Renders an organization-level XML page.
 */
export default function OrganizationPage({ page }: OrganizationPageProps) {
    const [searchParams] = useSearchParams();
    const { data: metadata, isLoading, error } = useApiData('/metadata.json');
    const activePage = searchParams.get('tab') ?? page ?? 'applications';

    return (
        <View
            metadata={metadata}
            page={activePage}
            isLoading={isLoading}
            error={error}
            emptyMessage="Unexpected response format for /metadata.json"
            unexpectedMessage="Unexpected response format for /metadata.json"
        />
    );
}
