import { Avatar as AstryxAvatar } from '@astryxdesign/core-0-3/Avatar';
import { useXmlRuntime } from '../core/context';
import { resolveXmlEnum, resolveXmlString } from '../core/props';
import { resolveAnchorUrl } from '../core/url';
import type { Props } from '../types';

/** Renders a data-oriented Astryx avatar with safe image URLs. */
export function Avatar({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const src = resolveAnchorUrl(services.requestBaseUrl, resolveXmlString(props, 'src', ctx));
    const name = resolveXmlString(props, 'name', ctx);
    const alt = resolveXmlString(props, 'alt', ctx);
    const size = resolveXmlEnum(
        props,
        'size',
        ctx,
        ['xsm', 'sm', 'md', 'lg', 'xl'],
        'md',
        'Avatar'
    );

    return <AstryxAvatar alt={alt || undefined} name={name || undefined} size={size} src={src || undefined} />;
}
