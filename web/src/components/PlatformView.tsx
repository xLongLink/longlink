import { useMemo } from 'react';
import { parseView } from '@/xml';
import { useQueryClient } from '@tanstack/react-query';
import { RouterXmlRuntime } from '@/components/RouterXmlRuntime';
import { platformXmlComponentRegistry } from '@/platform/xml/registry';
import { zSolutionUpdateCheck } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders a bundled XML View with platform-root navigation and API requests. */
export function PlatformView({ source, params = {} }: { source: string; params?: Record<string, string> }) {
    const queryClient = useQueryClient();
    const ast = useMemo(() => parseView(source), [source]);
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
            queryResult={(id, data) => {
                // Annotate update fields with configured names without exposing secret values.
                if (id !== 'updateCandidate') return data;

                const candidate = zSolutionUpdateCheck.parse(data);
                return {
                    ...candidate,
                    metadata: {
                        ...candidate.metadata,
                        environments: (candidate.metadata.environments ?? []).map((environment) => ({
                            ...environment,
                            configured: candidate.configured_envs.includes(environment.name),
                        })),
                    },
                };
            }}
            requestBaseUrl="/"
            requestCompleted={async (url) => {
                await queryClient.invalidateQueries({ queryKey: ['api', url], exact: true });
            }}
        />
    );
}
