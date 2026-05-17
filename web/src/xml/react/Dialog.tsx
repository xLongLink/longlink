import {
    Dialog as UIDialog,
    DialogContent as UIDialogContent,
    DialogDescription as UIDialogDescription,
    DialogFooter as UIDialogFooter,
    DialogHeader as UIDialogHeader,
    DialogTitle as UIDialogTitle,
    DialogTrigger as UIDialogTrigger,
} from '@/components/ui/dialog';
import { Button as UIButton } from '@/components/ui/button';
import { evaluate } from '@xml/core/expressions';
import type { ASTNode } from '@xml';
import { renderNode, useContext } from '@xml';

/** Props accepted by the XML Dialog component. */
export interface DialogProps {
    children?: ASTNode | ASTNode[] | null;
    defaultOpen?: boolean;
    open?: boolean;
}

/** Props accepted by the XML DialogTrigger component. */
export interface DialogTriggerProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Props accepted by the XML DialogContent component. */
export interface DialogContentProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Props accepted by the XML DialogHeader component. */
export interface DialogHeaderProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Props accepted by the XML DialogTitle component. */
export interface DialogTitleProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Props accepted by the XML DialogDescription component. */
export interface DialogDescriptionProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Props accepted by the XML DialogFooter component. */
export interface DialogFooterProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Renders a dialog root that groups trigger and content slots. */
export function Dialog({ children, defaultOpen, open }: DialogProps) {
    const { ctx } = useContext();

    return (
        <UIDialog defaultOpen={defaultOpen} open={open}>
            {renderNode(children ?? null, ctx)}
        </UIDialog>
    );
}


/** Renders the dialog trigger slot. */
export function DialogTrigger({ children }: DialogTriggerProps) {
    const { ctx } = useContext();

    if (
        children &&
        !Array.isArray(children) &&
        children.name === 'Button'
    ) {
        const className = children.params?.className ? String(evaluate(children.params.className, ctx) ?? '') : undefined;
        const size = children.params?.size ? String(evaluate(children.params.size, ctx) ?? '') : undefined;
        const variant = children.params?.variant ? String(evaluate(children.params.variant, ctx) ?? '') : undefined;

        return (
            <UIDialogTrigger render={<UIButton className={className} size={size as never} variant={variant as never} />}>
                {renderNode(children.children ?? null, ctx)}
            </UIDialogTrigger>
        );
    }

    return <UIDialogTrigger>{renderNode(children ?? null, ctx)}</UIDialogTrigger>;
}


/** Renders the dialog content surface. */
export function DialogContent({ children }: DialogContentProps) {
    const { ctx } = useContext();

    return <UIDialogContent>{renderNode(children ?? null, ctx)}</UIDialogContent>;
}


/** Renders the dialog header slot. */
export function DialogHeader({ children }: DialogHeaderProps) {
    const { ctx } = useContext();

    return <UIDialogHeader>{renderNode(children ?? null, ctx)}</UIDialogHeader>;
}


/** Renders the dialog title slot. */
export function DialogTitle({ children }: DialogTitleProps) {
    const { ctx } = useContext();

    return <UIDialogTitle>{renderNode(children ?? null, ctx)}</UIDialogTitle>;
}


/** Renders the dialog description slot. */
export function DialogDescription({ children }: DialogDescriptionProps) {
    const { ctx } = useContext();

    return <UIDialogDescription>{renderNode(children ?? null, ctx)}</UIDialogDescription>;
}


/** Renders the dialog footer slot. */
export function DialogFooter({ children }: DialogFooterProps) {
    const { ctx } = useContext();

    return <UIDialogFooter>{renderNode(children ?? null, ctx)}</UIDialogFooter>;
}
