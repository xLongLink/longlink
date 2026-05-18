import {
    Avatar as UIAvatar,
    AvatarBadge as UIAvatarBadge,
    AvatarFallback as UIAvatarFallback,
    AvatarGroup as UIAvatarGroup,
    AvatarGroupCount as UIAvatarGroupCount,
    AvatarImage as UIAvatarImage,
} from '@ui/avatar';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Avatar component. */
export interface AvatarProps {
    children?: ASTNode[];
    className?: string;
    size?: string;
}

/** Props accepted by the XML AvatarImage component. */
export interface AvatarImageProps {
    alt?: string;
    className?: string;
    src?: string;
}

/** Props accepted by the XML AvatarFallback component. */
export interface AvatarFallbackProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML AvatarBadge component. */
export interface AvatarBadgeProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML AvatarGroup component. */
export interface AvatarGroupProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML AvatarGroupCount component. */
export interface AvatarGroupCountProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders the avatar shell used for a single user or record. */
export function Avatar({ children, className: _className, size = 'default' }: AvatarProps) {
    const { ctx } = useXmlContext();

    return <UIAvatar size={size as never}>{renderNode(children ?? [], ctx)}</UIAvatar>;
}

/** Renders the avatar image slot. */
export function AvatarImage({ alt, className: _className, src }: AvatarImageProps) {
    return <UIAvatarImage alt={alt} src={src} />;
}

/** Renders the avatar fallback slot. */
export function AvatarFallback({ children, className: _className }: AvatarFallbackProps) {
    const { ctx } = useXmlContext();

    return <UIAvatarFallback>{renderNode(children ?? [], ctx)}</UIAvatarFallback>;
}

/** Renders the avatar badge overlay. */
export function AvatarBadge({ children, className: _className }: AvatarBadgeProps) {
    const { ctx } = useXmlContext();

    return <UIAvatarBadge>{renderNode(children ?? [], ctx)}</UIAvatarBadge>;
}

/** Renders the avatar group shell for stacked avatars. */
export function AvatarGroup({ children, className: _className }: AvatarGroupProps) {
    const { ctx } = useXmlContext();

    return <UIAvatarGroup>{renderNode(children ?? [], ctx)}</UIAvatarGroup>;
}

/** Renders the trailing count chip inside an avatar group. */
export function AvatarGroupCount({ children, className: _className }: AvatarGroupCountProps) {
    const { ctx } = useXmlContext();

    return <UIAvatarGroupCount>{renderNode(children ?? [], ctx)}</UIAvatarGroupCount>;
}
