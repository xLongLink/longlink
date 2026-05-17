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
    children?: ASTNode | ASTNode[] | null;
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
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML AvatarBadge component. */
export interface AvatarBadgeProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML AvatarGroup component. */
export interface AvatarGroupProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML AvatarGroupCount component. */
export interface AvatarGroupCountProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders the avatar shell used for a single user or record. */
export function Avatar({ children, className, size = 'default' }: AvatarProps) {
    const { ctx } = useXmlContext();

    return (
        <UIAvatar className={className} size={size as never}>
            {renderNode(children ?? null, ctx)}
        </UIAvatar>
    );
}


/** Renders the avatar image slot. */
export function AvatarImage({ alt, className, src }: AvatarImageProps) {
    return <UIAvatarImage alt={alt} className={className} src={src} />;
}


/** Renders the avatar fallback slot. */
export function AvatarFallback({ children, className }: AvatarFallbackProps) {
    const { ctx } = useXmlContext();

    return <UIAvatarFallback className={className}>{renderNode(children ?? null, ctx)}</UIAvatarFallback>;
}


/** Renders the avatar badge overlay. */
export function AvatarBadge({ children, className }: AvatarBadgeProps) {
    const { ctx } = useXmlContext();

    return <UIAvatarBadge className={className}>{renderNode(children ?? null, ctx)}</UIAvatarBadge>;
}


/** Renders the avatar group shell for stacked avatars. */
export function AvatarGroup({ children, className }: AvatarGroupProps) {
    const { ctx } = useXmlContext();

    return <UIAvatarGroup className={className}>{renderNode(children ?? null, ctx)}</UIAvatarGroup>;
}


/** Renders the trailing count chip inside an avatar group. */
export function AvatarGroupCount({ children, className }: AvatarGroupCountProps) {
    const { ctx } = useXmlContext();

    return <UIAvatarGroupCount className={className}>{renderNode(children ?? null, ctx)}</UIAvatarGroupCount>;
}
