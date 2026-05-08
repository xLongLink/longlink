import { useApiData } from '@/hooks/use-data';
import { fromXml, RenderXML } from '@/xml';

type ViewProps = {
    xmlSource: string | null;
};

const isXmlDocument = (value: string): boolean => value.trimStart().startsWith('<');

/**
 * Fetches XML content from a source URL or renders inline XML and then renders it.
 */
export default function View({ xmlSource }: ViewProps) {
    const shouldFetch = Boolean(xmlSource) && !isXmlDocument(xmlSource ?? '');
    const { data: fetchedXml, isLoading, error } = useApiData<string>(shouldFetch ? xmlSource : null);
    const xml = shouldFetch ? fetchedXml : xmlSource;

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!xml) {
        return <div>Unexpected response format</div>;
    }

    const ast = fromXml(xml);

    return (
        <div className="space-y-6">
            <RenderXML ast={ast} />
        </div>
    );
}
