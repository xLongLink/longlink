import { Avatar as AstryxAvatar, type AvatarSize } from '@astryxdesign/core/Avatar';
import { useXmlContext, useXmlServices } from '../core/context';
import { resolveXmlEnum, resolveXmlString } from '../core/props';
import { resolveAnchorUrl } from '../core/url';
import type { Props } from '../types';

/** Renders a data-oriented Astryx avatar with safe image URLs. */
export function Avatar({ props }: Props) {
    const ctx = useXmlContext();
    const services = useXmlServices();
    const src = resolveAnchorUrl(services.requestBaseUrl, resolveXmlString(props, 'src', ctx));
    const fallbackSrc = resolveAnchorUrl(services.requestBaseUrl, resolveXmlString(props, 'fallbackSrc', ctx));
    const name = resolveXmlString(props, 'name', ctx);
    const alt = resolveXmlString(props, 'alt', ctx);
    const size = resolveXmlEnum<Extract<AvatarSize, string>>(
        props,
        'size',
        ctx,
        ['xsm', 'sm', 'md', 'lg', 'xl'],
        'md',
        'Avatar'
    );

    return (
        <AstryxAvatar
            alt={alt || undefined}
            fallbackSrc={fallbackSrc || undefined}
            name={name || undefined}
            size={size}
            src={src || undefined}
        />
    );
}
