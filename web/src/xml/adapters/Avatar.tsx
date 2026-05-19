import {
    Avatar as UIAvatar,
    AvatarBadge as UIAvatarBadge,
    AvatarFallback as UIAvatarFallback,
    AvatarImage as UIAvatarImage,
} from '@ui/avatar';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString } from './props';

/** Props accepted by the XML Avatar component. */
export interface AvatarProps extends Props {}

/** Props accepted by the XML AvatarImage component. */
export interface AvatarImageProps extends Props {}

/** Props accepted by the XML AvatarFallback component. */
export interface AvatarFallbackProps extends Props {}

/** Props accepted by the XML AvatarBadge component. */
export interface AvatarBadgeProps extends Props {}

/** Renders the avatar shell used for a single user or record. */
export function Avatar({ props, nodes }: AvatarProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const size = resolveXmlString(props, 'size', ctx, 'default');

    return <UIAvatar size={size as never}>{renderNode(children ?? [], ctx)}</UIAvatar>;
}

/** Renders the avatar image slot. */
export function AvatarImage({ props, nodes }: AvatarImageProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const alt = resolveXmlString(props, 'alt', ctx);
    const src = resolveXmlString(props, 'src', ctx);
    return <UIAvatarImage alt={alt} src={src} />;
}

/** Renders the avatar fallback slot. */
export function AvatarFallback({ props, nodes }: AvatarFallbackProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIAvatarFallback>{renderNode(children ?? [], ctx)}</UIAvatarFallback>;
}

/** Renders the avatar badge overlay. */
export function AvatarBadge({ props, nodes }: AvatarBadgeProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIAvatarBadge>{renderNode(children ?? [], ctx)}</UIAvatarBadge>;
}
