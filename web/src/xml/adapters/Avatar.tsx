import type { Props } from '../types';
import { resolveXml } from '../core/props';
import { resolveAnchorUrl } from '../core/url';
import { useXmlRuntime } from '../core/context';
import { Avatar as AstryxAvatar } from '@astryxdesign/core/Avatar';

export function Avatar({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const source = resolveXml(props, 'src', ctx);
    const fallbackSource = resolveXml(props, 'fallbackSrc', ctx);
    const src = resolveAnchorUrl(services.requestBaseUrl, typeof source === 'string' ? source : '');
    const fallbackSrc = resolveAnchorUrl(
        services.requestBaseUrl,
        typeof fallbackSource === 'string' ? fallbackSource : ''
    );
    const name = resolveXml(props, 'name', ctx);
    const alt = resolveXml(props, 'alt', ctx);

    return (
        <AstryxAvatar
            alt={typeof alt === 'string' ? alt : undefined}
            fallbackSrc={fallbackSrc || undefined}
            name={typeof name === 'string' ? name : undefined}
            src={src || undefined}
        />
    );
}
