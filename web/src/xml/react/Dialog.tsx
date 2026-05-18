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
import type { ASTNode } from '@xml';
import { evaluate } from '@xml/core/expressions';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Dialog component. */
export interface DialogProps {
    children?: ASTNode[];
    defaultOpen?: boolean;
    open?: boolean;
}

/** Props accepted by the XML DialogTrigger component. */
export interface DialogTriggerProps {
    children?: ASTNode[];
}

/** Props accepted by the XML DialogContent component. */
export interface DialogContentProps {
    children?: ASTNode[];
}

/** Props accepted by the XML DialogHeader component. */
export interface DialogHeaderProps {
    children?: ASTNode[];
}

/** Props accepted by the XML DialogTitle component. */
export interface DialogTitleProps {
    children?: ASTNode[];
}

/** Props accepted by the XML DialogDescription component. */
export interface DialogDescriptionProps {
    children?: ASTNode[];
}

/** Props accepted by the XML DialogFooter component. */
export interface DialogFooterProps {
    children?: ASTNode[];
}

/** Renders a dialog root that groups trigger and content slots. */
export function Dialog({ children, defaultOpen, open }: DialogProps) {
    const { ctx } = useXmlContext();

    return (
        <UIDialog defaultOpen={defaultOpen} open={open}>
            {renderNode(children ?? [], ctx)}
        </UIDialog>
    );
}

/** Renders the dialog trigger slot. */
export function DialogTrigger({ children }: DialogTriggerProps) {
    const { ctx } = useXmlContext();
    const triggerChildren = Array.isArray(children) ? children : children ? [children] : [];
    const buttonChild =
        triggerChildren.length === 1 && triggerChildren[0]?.name === 'Button' ? triggerChildren[0] : null;
    const anchorChild = triggerChildren.length === 1 && triggerChildren[0]?.name === 'A' ? triggerChildren[0] : null;

    if (buttonChild) {
        // Reuse the XML button's label as the trigger content while keeping the button shell.
        const variant = buttonChild.params?.variant
            ? String(evaluate(buttonChild.params.variant, ctx) ?? 'default')
            : 'default';
        const size = buttonChild.params?.size ? String(evaluate(buttonChild.params.size, ctx) ?? 'default') : 'default';

        return (
            <UIDialogTrigger render={<UIButton type="button" variant={variant as never} size={size as never} />}>
                {renderNode(buttonChild.children ?? [], ctx)}
            </UIDialogTrigger>
        );
    }

    if (anchorChild) {
        // Reuse the XML anchor's label and href for a link-style trigger.
        const href = anchorChild.params?.href ? String(evaluate(anchorChild.params.href, ctx) ?? '') : '';

        return (
            <UIDialogTrigger
                render={
                    <a
                        className="inline-flex items-center gap-1 text-primary underline underline-offset-4 hover:opacity-80"
                        {...(href ? { href } : {})}
                    />
                }
            >
                {renderNode(anchorChild.children ?? [], ctx)}
            </UIDialogTrigger>
        );
    }

    return <UIDialogTrigger>{renderNode(children ?? [], ctx)}</UIDialogTrigger>;
}

/** Renders the dialog content surface. */
export function DialogContent({ children }: DialogContentProps) {
    const { ctx } = useXmlContext();

    return <UIDialogContent>{renderNode(children ?? [], ctx)}</UIDialogContent>;
}

/** Renders the dialog header slot. */
export function DialogHeader({ children }: DialogHeaderProps) {
    const { ctx } = useXmlContext();

    return <UIDialogHeader>{renderNode(children ?? [], ctx)}</UIDialogHeader>;
}

/** Renders the dialog title slot. */
export function DialogTitle({ children }: DialogTitleProps) {
    const { ctx } = useXmlContext();

    return <UIDialogTitle>{renderNode(children ?? [], ctx)}</UIDialogTitle>;
}

/** Renders the dialog description slot. */
export function DialogDescription({ children }: DialogDescriptionProps) {
    const { ctx } = useXmlContext();

    return <UIDialogDescription>{renderNode(children ?? [], ctx)}</UIDialogDescription>;
}

/** Renders the dialog footer slot. */
export function DialogFooter({ children }: DialogFooterProps) {
    const { ctx } = useXmlContext();

    return <UIDialogFooter>{renderNode(children ?? [], ctx)}</UIDialogFooter>;
}
