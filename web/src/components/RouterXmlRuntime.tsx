import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createContext as createXmlContext, RenderXML } from '@/xml';
import type { ASTNode, RuntimeServices, XmlComponentRegistry } from '@/xml/types';

type RouterXmlRuntimeProps = {
    ast: ASTNode;
    navigationBaseUrl: string;
    params: Record<string, string>;
    registry?: XmlComponentRegistry;
    requestBaseUrl: string;
    requestCompleted?: RuntimeServices['requestCompleted'];
};

/** Owns one XML runtime with navigation delegated to the React Router host. */
export function RouterXmlRuntime({
    ast,
    navigationBaseUrl,
    params,
    registry,
    requestBaseUrl,
    requestCompleted,
}: RouterXmlRuntimeProps) {
    const navigate = useNavigate();
    const [runtime] = useState(() => {
        return createXmlContext({
            navigate: (url) => {
                const destination = new URL(url, window.location.origin);

                if (destination.origin === window.location.origin) {
                    void navigate(`${destination.pathname}${destination.search}${destination.hash}`);
                    return;
                }

                window.location.assign(url);
            },
            navigationBaseUrl,
            params,
            registry,
            requestBaseUrl,
            requestCompleted,
        });
    });

    return <RenderXML ast={ast} ctx={runtime} />;
}
