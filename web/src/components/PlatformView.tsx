import { useMemo } from 'react';
import { parseXML } from '@/xml';
import { useQueryClient } from '@tanstack/react-query';
import { RouterXmlRuntime } from '@/components/RouterXmlRuntime';
import { platformXmlComponentRegistry } from '@/platform/xml/registry';

/** Renders a bundled XML View with platform-root navigation and API requests. */
export function PlatformView({ source, params = {} }: { source: string; params?: Record<string, string> }) {
    const queryClient = useQueryClient();
    const ast = useMemo(() => parseXML(source), [source]);
    const runtimeKey = JSON.stringify([
        source,
        Object.entries(params).sort(([left], [right]) => left.localeCompare(right)),
    ]);

    return (
        <RouterXmlRuntime
            ast={ast}
            key={runtimeKey}
            navigationBaseUrl="/"
            params={params}
            registry={platformXmlComponentRegistry}
            requestBaseUrl="/"
            requestCompleted={async (url) => {
                await queryClient.invalidateQueries({ queryKey: ['api', url], exact: true });
            }}
        />
    );
}
