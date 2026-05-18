import {
    Avatar as UIAvatar,
    AvatarBadge as UIAvatarBadge,
    AvatarFallback as UIAvatarFallback,
    AvatarImage as UIAvatarImage,
} from '@ui/avatar';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Avatar component. */
export interface AvatarProps {
    children?: ASTNode[];
    size?: string;
}

/** Props accepted by the XML AvatarImage component. */
export interface AvatarImageProps {
    alt?: string;
    src?: string;
}

/** Props accepted by the XML AvatarFallback component. */
export interface AvatarFallbackProps {
    children?: ASTNode[];
}

/** Props accepted by the XML AvatarBadge component. */
export interface AvatarBadgeProps {
    children?: ASTNode[];
}

/** Renders the avatar shell used for a single user or record. */
export function Avatar({ children, size = 'default' }: AvatarProps) {
    const { ctx } = useXmlContext();

    return <UIAvatar size={size as never}>{renderNode(children ?? [], ctx)}</UIAvatar>;
}

/** Renders the avatar image slot. */
export function AvatarImage({ alt, src }: AvatarImageProps) {
    return <UIAvatarImage alt={alt} src={src} />;
}

/** Renders the avatar fallback slot. */
export function AvatarFallback({ children }: AvatarFallbackProps) {
    const { ctx } = useXmlContext();

    return <UIAvatarFallback>{renderNode(children ?? [], ctx)}</UIAvatarFallback>;
}

/** Renders the avatar badge overlay. */
export function AvatarBadge({ children }: AvatarBadgeProps) {
    const { ctx } = useXmlContext();

    return <UIAvatarBadge>{renderNode(children ?? [], ctx)}</UIAvatarBadge>;
}
