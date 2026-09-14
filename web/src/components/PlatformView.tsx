import { parseXML } from '@/xml';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RouterXmlRuntime } from '@/components/RouterXmlRuntime';

/** Renders a bundled XML View with platform-root navigation and API requests. */
export function PlatformView({ source, params = {} }: { source: string; params?: Record<string, string> }) {
    const queryClient = useQueryClient();
    const [ast] = useState(() => parseXML(source));

    return (
        <RouterXmlRuntime
            ast={ast}
            navigationBaseUrl="/"
            params={params}
            requestBaseUrl="/"
            requestCompleted={async (url) => {
                await queryClient.invalidateQueries({ queryKey: ['api', url], exact: true });
            }}
        />
    );
}
