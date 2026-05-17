import { Label as UILabel } from '@/components/ui/label';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Label component. */
export interface LabelProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    htmlFor?: string;
}

/** Renders a shadcn-backed label element for form controls. */
export function Label({ children, className, htmlFor }: LabelProps) {
    const { ctx } = useXmlContext();

    return (
        <UILabel className={className} htmlFor={htmlFor}>
            {renderNode(children ?? null, ctx)}
        </UILabel>
    );
}
