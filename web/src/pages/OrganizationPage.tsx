import { useApiData } from '@/hooks/use-data';
import View from './View';

type OrganizationPageProps = {
    page: string;
};

/**
 * Renders an organization-level XML page.
 */
export default function OrganizationPage({ page }: OrganizationPageProps) {
    const { data: metadata, isLoading, error } = useApiData('/metadata.json');

    return (
        <View
            metadata={metadata}
            page={page}
            isLoading={isLoading}
            error={error}
            emptyMessage="Unexpected response format for /metadata.json"
            unexpectedMessage="Unexpected response format for /metadata.json"
        />
    );
}
