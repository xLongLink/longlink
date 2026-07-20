import { Avatar as AstryxAvatar, type AvatarSize } from '@astryxdesign/core/Avatar';
import type { Props } from '@/xml/types';
import { useAnchorUrl } from '@/xml/core/url';
import { useXmlContext } from '@/xml/core/context';
import { resolveXmlEnum, resolveXmlString } from './props';

/** Renders a data-oriented Astryx avatar with safe image URLs. */
export function Avatar({ props }: Props) {
    const { ctx } = useXmlContext();
    const src = useAnchorUrl(resolveXmlString(props, 'src', ctx));
    const fallbackSrc = useAnchorUrl(resolveXmlString(props, 'fallbackSrc', ctx));
    const name = resolveXmlString(props, 'name', ctx);
    const alt = resolveXmlString(props, 'alt', ctx);
    const size = resolveXmlEnum(props, 'size', ctx, ['tiny', 'xsmall', 'small', 'medium', 'large'], 'small', 'Avatar');

    return (
        <AstryxAvatar
            alt={alt || undefined}
            fallbackSrc={fallbackSrc || undefined}
            name={name || undefined}
            size={size as AvatarSize}
            src={src || undefined}
        />
    );
}
