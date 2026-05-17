import { Badge as UIBadge } from '@ui/badge';
import type { ASTNode } from '@xml';
import { renderNode, useContext } from '@xml';

/** Props accepted by the XML Badge component. */
export interface BadgeProps {
    children?: ASTNode | ASTNode[] | null;
    variant?: string;
}

/** Renders a shadcn-backed badge for short status labels and tags. */
export function Badge({ children, variant = 'default' }: BadgeProps) {
    const { ctx } = useContext();

    return (
        <UIBadge variant={variant as never}>
            {renderNode(children ?? null, ctx)}
        </UIBadge>
    );
}
