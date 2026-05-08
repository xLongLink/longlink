import { useApiData } from '@/hooks/use-data';
import { useSearchParams } from 'react-router';
import View from './View';

/**
 * Renders an organization-level XML page.
 */
export default function Organization() {
    const [searchParams] = useSearchParams();
    const { data: metadata, isLoading, error } = useApiData('/metadata.json');
    const activePage = searchParams.get('tab') ?? 'applications';

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
