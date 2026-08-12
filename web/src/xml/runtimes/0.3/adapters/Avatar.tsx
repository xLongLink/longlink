import { Avatar as AstryxAvatar } from '@astryxdesign/core-0-3/Avatar';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, isXmlString, resolveXml } from '../core/props';
import { resolveAnchorUrl } from '../core/url';
import type { Props } from '../types';

/** Renders a data-oriented Astryx avatar with safe image URLs. */
export function Avatar({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const source = resolveXml(props, 'src', ctx);
    const src = resolveAnchorUrl(services.requestBaseUrl, isXmlString(source) ? source : '');
    const name = resolveXml(props, 'name', ctx);
    const alt = resolveXml(props, 'alt', ctx);
    const sizeValue = resolveXml(props, 'size', ctx);
    const size = isXmlEnum(sizeValue, ['xsm', 'sm', 'md', 'lg', 'xl']) ? sizeValue : 'md';

    return <AstryxAvatar alt={isXmlString(alt) ? alt : undefined} name={isXmlString(name) ? name : undefined} size={size} src={src || undefined} />;
}
