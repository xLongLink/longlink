import { Avatar as AstryxAvatar } from '@astryxdesign/core-0-3/Avatar';
import type { Props } from '../types';
import { AVATAR_SIZES } from '../constants';
import { resolveAnchorUrl } from '../core/url';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, resolveXml } from '../core/props';

/**
 * https://astryx.atmeta.com/components/Avatar?tab=properties
 * - src: string
 * - fallbackSrc: string
 * - name: string
 * - alt: string
 * - size: str
 */
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
    const sizeValue = resolveXml(props, 'size', ctx);
    const size = isXmlEnum(sizeValue, AVATAR_SIZES) ? sizeValue : 'md';

    return (
        <AstryxAvatar
            alt={typeof alt === 'string' ? alt : undefined}
            fallbackSrc={fallbackSrc || undefined}
            name={typeof name === 'string' ? name : undefined}
            size={size}
            src={src || undefined}
        />
    );
}
