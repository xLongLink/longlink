import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { ASTNode, RuntimeServices } from '@/xml/types';
import { createContext as createXmlContext, RenderXML } from '@/xml';

type RouterXmlRuntimeProps = {
    ast: ASTNode;
    navigationBaseUrl: string;
    params: Record<string, string>;
    requestBaseUrl: string;
    requestCompleted?: RuntimeServices['requestCompleted'];
};

/** Owns one XML runtime with navigation delegated to the React Router host. */
export function RouterXmlRuntime({
    ast,
    navigationBaseUrl,
    params,
    requestBaseUrl,
    requestCompleted,
}: RouterXmlRuntimeProps) {
    const navigate = useNavigate();
    const [runtime] = useState(() => {
        return createXmlContext({
            navigate: (url) => {
                const destination = new URL(url, window.location.origin);

                if (destination.origin === window.location.origin) {
                    navigate(`${destination.pathname}${destination.search}${destination.hash}`);
                    return;
                }

                window.location.assign(url);
            },
            navigationBaseUrl,
            params,
            requestBaseUrl,
            requestCompleted,
        });
    });

    return <RenderXML ast={ast} ctx={runtime} />;
}
