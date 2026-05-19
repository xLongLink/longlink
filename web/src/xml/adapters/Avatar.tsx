import {
    Avatar as UIAvatar,
    AvatarBadge as UIAvatarBadge,
    AvatarFallback as UIAvatarFallback,
    AvatarImage as UIAvatarImage,
} from '@ui/avatar';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlString } from './props';

/** Props accepted by the XML Avatar component. */

/** Props accepted by the XML AvatarImage component. */

/** Props accepted by the XML AvatarFallback component. */

/** Props accepted by the XML AvatarBadge component. */

/** Renders the avatar shell used for a single user or record. */
export function Avatar({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const size = resolveXmlString(props, 'size', ctx, 'default');

    return <UIAvatar size={size as never}>{renderNode(children ?? [], ctx)}</UIAvatar>;
}

/** Renders the avatar image slot. */
export function AvatarImage({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const alt = resolveXmlString(props, 'alt', ctx);
    const src = resolveXmlString(props, 'src', ctx);
    return <UIAvatarImage alt={alt} src={src} />;
}

/** Renders the avatar fallback slot. */
export function AvatarFallback({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIAvatarFallback>{renderNode(children ?? [], ctx)}</UIAvatarFallback>;
}

/** Renders the avatar badge overlay. */
export function AvatarBadge({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIAvatarBadge>{renderNode(children ?? [], ctx)}</UIAvatarBadge>;
}
