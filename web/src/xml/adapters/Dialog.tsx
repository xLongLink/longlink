import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { evaluate } from '@/xml/expressions';
import { resolveAnchorUrl } from '@/xml/core/url';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { Button as UIButton } from '@/components/ui/button';
import {
    Dialog as UIDialog,
    DialogContent as UIDialogContent,
    DialogDescription as UIDialogDescription,
    DialogTitle as UIDialogTitle,
    DialogTrigger as UIDialogTrigger,
} from '@/components/ui/dialog';
import { resolveXmlBoolean, resolveXmlString } from './props';
import { resolveButtonSize, resolveButtonVariant } from './Button';

/** Renders a dialog root that groups trigger and content slots. */
export function Dialog({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const open = resolveXmlBoolean(props, 'open', ctx);

    return <UIDialog open={open}>{renderNode(nodes, ctx)}</UIDialog>;
}

/** Renders the dialog trigger slot. */
export function DialogTrigger({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const triggerChildren = nodes;
    const buttonChild =
        triggerChildren.length === 1 && triggerChildren[0]?.name === 'Button' ? triggerChildren[0] : null;
    const anchorChild = triggerChildren.length === 1 && triggerChildren[0]?.name === 'A' ? triggerChildren[0] : null;

    // Special-case button triggers to preserve button styling.
    if (buttonChild) {
        // Reuse the XML button's label as the trigger content while keeping the button shell.
        const childContent = renderNode(buttonChild.children ?? [], ctx);
        const text = buttonChild.params?.i18n ? resolveTranslation(buttonChild.params, ctx) : childContent;
        const variant = resolveButtonVariant(
            buttonChild.params?.variant ? String(evaluate(buttonChild.params.variant, ctx) ?? 'default') : 'default'
        );
        const size = resolveButtonSize(
            buttonChild.params?.size ? String(evaluate(buttonChild.params.size, ctx) ?? 'default') : 'default'
        );

        return (
            <UIDialogTrigger render={<UIButton type="button" variant={variant} size={size} />}>
                {buttonChild.params?.i18n ? childContent : null}
                {text}
            </UIDialogTrigger>
        );
    }

    // Special-case anchor triggers to preserve link styling.
    if (anchorChild) {
        // Reuse the XML anchor's label and href for a link-style trigger.
        const childContent = renderNode(anchorChild.children ?? [], ctx);
        const text = anchorChild.params?.i18n ? resolveTranslation(anchorChild.params, ctx) : childContent;
        const active = resolveXmlString(anchorChild.params ?? {}, 'active', ctx);
        const href = anchorChild.params?.href
            ? resolveAnchorUrl(
                  String(ctx.navigationBaseUrl ?? ''),
                  String(evaluate(anchorChild.params.href, ctx) ?? '')
              )
            : '';

        return (
            <UIDialogTrigger
                render={
                    <a
                        className={
                            active === 'always'
                                ? 'inline-flex items-center gap-1 text-accent underline underline-offset-4 hover:opacity-80'
                                : 'inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80'
                        }
                        {...(href ? { href } : {})}
                    />
                }
            >
                {anchorChild.params?.i18n ? childContent : null}
                {text}
            </UIDialogTrigger>
        );
    }

    return <UIDialogTrigger>{renderNode(nodes, ctx)}</UIDialogTrigger>;
}

/** Renders the dialog content surface. */
export function DialogContent({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIDialogContent>{renderNode(nodes, ctx)}</UIDialogContent>;
}

/** Renders the dialog title slot. */
export function DialogTitle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UIDialogTitle>{text}</UIDialogTitle>;
}

/** Renders the dialog description slot. */
export function DialogDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UIDialogDescription>{text}</UIDialogDescription>;
}
