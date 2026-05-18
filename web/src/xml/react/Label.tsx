import { Label as UILabel } from '@/components/ui/label';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Label component. */
export interface LabelProps {
    children?: ASTNode[];
    htmlFor?: string;
}

/** Renders a shadcn-backed label element for form controls. */
export function Label({ children, htmlFor }: LabelProps) {
    const { ctx } = useXmlContext();

    return <UILabel htmlFor={htmlFor}>{renderNode(children ?? [], ctx)}</UILabel>;
}
