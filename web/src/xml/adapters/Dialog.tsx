import { Button as UIButton } from '@/components/ui/button';
import {
    Dialog as UIDialog,
    DialogContent as UIDialogContent,
    DialogDescription as UIDialogDescription,
    DialogFooter as UIDialogFooter,
    DialogHeader as UIDialogHeader,
    DialogTitle as UIDialogTitle,
    DialogTrigger as UIDialogTrigger,
} from '@/components/ui/dialog';
import { useXmlContext } from '../core/context';
import { evaluate } from '../core/expressions';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlBoolean } from './props';

/** Renders a dialog root that groups trigger and content slots. */
export function Dialog({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const defaultOpen = resolveXmlBoolean(props, 'defaultOpen', ctx);
    const open = resolveXmlBoolean(props, 'open', ctx);

    return (
        <UIDialog defaultOpen={defaultOpen} open={open}>
            {renderNode(children ?? [], ctx)}
        </UIDialog>
    );
}

/** Renders the dialog trigger slot. */
export function DialogTrigger({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
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
export function DialogContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIDialogContent>{renderNode(children ?? [], ctx)}</UIDialogContent>;
}

/** Renders the dialog header slot. */
export function DialogHeader({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIDialogHeader>{renderNode(children ?? [], ctx)}</UIDialogHeader>;
}

/** Renders the dialog title slot. */
export function DialogTitle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIDialogTitle>{renderNode(children ?? [], ctx)}</UIDialogTitle>;
}

/** Renders the dialog description slot. */
export function DialogDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIDialogDescription>{renderNode(children ?? [], ctx)}</UIDialogDescription>;
}

/** Renders the dialog footer slot. */
export function DialogFooter({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIDialogFooter>{renderNode(children ?? [], ctx)}</UIDialogFooter>;
}
