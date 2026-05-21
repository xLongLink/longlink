import { Button as UIButton } from '@/components/ui/button';
import {
    Dialog as UIDialog,
    DialogContent as UIDialogContent,
    DialogDescription as UIDialogDescription,
    DialogTitle as UIDialogTitle,
    DialogTrigger as UIDialogTrigger,
} from '@/components/ui/dialog';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import { evaluate } from '@xml/expressions';
import type { Props } from '@xml/types';
import { resolveXmlBoolean, resolveXmlString } from './props';

/** Renders a dialog root that groups trigger and content slots. */
export function Dialog({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultOpen = resolveXmlBoolean(props, 'defaultOpen', ctx);
    const open = resolveXmlBoolean(props, 'open', ctx);

    return (
        <UIDialog defaultOpen={defaultOpen} open={open}>
            {renderNode(nodes, ctx)}
        </UIDialog>
    );
}

/** Renders the dialog trigger slot. */
export function DialogTrigger({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const triggerChildren = nodes;
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
        const active = resolveXmlString(anchorChild.params ?? {}, 'active', ctx);
        const href = anchorChild.params?.href ? String(evaluate(anchorChild.params.href, ctx) ?? '') : '';
        const linkClassName =
            active === 'always'
                ? 'inline-flex items-center gap-1 text-accent underline underline-offset-4 hover:opacity-80'
                : 'inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80';

        return (
            <UIDialogTrigger render={<a className={linkClassName} {...(href ? { href } : {})} />}>
                {renderNode(anchorChild.children ?? [], ctx)}
            </UIDialogTrigger>
        );
    }

    return <UIDialogTrigger>{renderNode(nodes, ctx)}</UIDialogTrigger>;
}

/** Renders the dialog content surface. */
export function DialogContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIDialogContent>{renderNode(nodes, ctx)}</UIDialogContent>;
}

/** Renders the dialog title slot. */
export function DialogTitle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIDialogTitle>{renderNode(nodes, ctx)}</UIDialogTitle>;
}

/** Renders the dialog description slot. */
export function DialogDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIDialogDescription>{renderNode(nodes, ctx)}</UIDialogDescription>;
}
