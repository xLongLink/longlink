import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createContext as createXmlContext, parseXML, RenderXML } from '@/xml';

/** Renders a bundled XML View with platform-root navigation and API requests. */
export function PlatformView({ source }: { source: string }) {
    const navigate = useNavigate();
    const [ast] = useState(() => parseXML(source));
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
            navigationBaseUrl: '/',
            params: {},
            requestBaseUrl: '/',
        });
    });

    return <RenderXML ast={ast} ctx={runtime} />;
}
