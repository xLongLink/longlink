import type { ComponentProps } from 'react';
import { hasProtocol } from 'ufo';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { isAppRelativeUrl, resolveUrl, useUrl } from '@/xml/core/url';
import {
    Avatar as UIAvatar,
    AvatarBadge as UIAvatarBadge,
    AvatarFallback as UIAvatarFallback,
    AvatarImage as UIAvatarImage,
} from '@/components/ui/avatar';
import { resolveXmlString } from './props';

type AvatarSize = NonNullable<ComponentProps<typeof UIAvatar>['size']>;

/** Returns a safe browser image URL for an XML avatar source. */
function resolveAvatarImageSource(baseUrl: string, src: string): string | undefined {
    const value = src.trim();

    // Drop empty, protocol-relative, and backslash-containing sources.
    if (!value || value.startsWith('//') || value.includes('\\')) return undefined;

    // Validate absolute avatar URLs before using them.
    if (hasProtocol(value)) {
        // Parse absolute URLs with the platform URL implementation.
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
    const size = resolveAvatarSize(resolveXmlString(props, 'size', ctx, 'default'));

    return <UIAvatar size={size}>{renderNode(nodes, ctx)}</UIAvatar>;
}

/** Resolves a validated XML avatar size. */
function resolveAvatarSize(value: string): AvatarSize {
    // Accept only avatar sizes supported by the UI component.
    switch (value) {
        case 'default':
        case 'sm':
        case 'lg':
            return value;
        default:
            throw new Error(`Unsupported Avatar size '${value}'`);
    }
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
