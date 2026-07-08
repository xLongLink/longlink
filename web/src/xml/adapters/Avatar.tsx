import {
    Avatar as UIAvatar,
    AvatarBadge as UIAvatarBadge,
    AvatarFallback as UIAvatarFallback,
    AvatarImage as UIAvatarImage,
} from '@/components/ui/avatar';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import { isAppRelativeUrl, resolveUrl, useUrl } from '@/xml/core/url';
import type { Props } from '@/xml/types';
import { hasProtocol } from 'ufo';
import { resolveXmlString } from './props';

/** Returns a safe browser image URL for an XML avatar source. */
function resolveAvatarImageSource(baseUrl: string, src: string): string | undefined {
    const value = src.trim();

    if (!value || value.startsWith('//') || value.includes('\\')) return undefined;

    if (hasProtocol(value)) {
        try {
            const url = new URL(value);

            return url.protocol === 'http:' || url.protocol === 'https:' ? value : undefined;
        } catch {
            return undefined;
        }
    }

    return isAppRelativeUrl(value) ? resolveUrl(baseUrl, value) : undefined;
}

/** Renders the avatar shell used for a single user or record. */
export function Avatar({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const size = resolveXmlString(props, 'size', ctx, 'default');

    return <UIAvatar size={size as never}>{renderNode(nodes, ctx)}</UIAvatar>;
}

/** Renders the avatar image slot. */
export function AvatarImage({ props }: Props) {
    const { ctx } = useXmlContext();
    const baseUrl = useUrl('');
    const alt = resolveXmlString(props, 'alt', ctx);
    const src = resolveXmlString(props, 'src', ctx);
    return <UIAvatarImage alt={alt} src={resolveAvatarImageSource(baseUrl, src)} />;
}

/** Renders the avatar fallback slot. */
export function AvatarFallback({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UIAvatarFallback>{text}</UIAvatarFallback>;
}

/** Renders the avatar badge overlay. */
export function AvatarBadge({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UIAvatarBadge>{text}</UIAvatarBadge>;
}
