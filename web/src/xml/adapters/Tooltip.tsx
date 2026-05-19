import {
    Tooltip as UITooltip,
    TooltipContent as UITooltipContent,
    TooltipProvider as UITooltipProvider,
    TooltipTrigger as UITooltipTrigger,
} from '@ui/tooltip';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlBoolean, resolveXmlString } from './props';

/** Props accepted by the XML TooltipProvider component. */
export interface TooltipProviderProps extends Props {}

/** Props accepted by the XML Tooltip component. */
export interface TooltipProps extends Props {}

/** Props accepted by the XML TooltipTrigger component. */
export interface TooltipTriggerProps extends Props {}

/** Props accepted by the XML TooltipContent component. */
export interface TooltipContentProps extends Props {}

/** Renders the tooltip provider wrapper around descendant tooltips. */
export function TooltipProvider({ props, nodes }: TooltipProviderProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UITooltipProvider>{renderNode(children ?? [], ctx)}</UITooltipProvider>;
}

/** Renders the tooltip root shell. */
export function Tooltip({ props, nodes }: TooltipProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const defaultOpen = resolveXmlBoolean(props, 'defaultOpen', ctx);
    const open = resolveXmlBoolean(props, 'open', ctx);

    return (
        <UITooltip defaultOpen={defaultOpen} open={open}>
            {renderNode(children ?? [], ctx)}
        </UITooltip>
    );
}

/** Renders the tooltip trigger slot. */
export function TooltipTrigger({ props, nodes }: TooltipTriggerProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UITooltipTrigger>{renderNode(children ?? [], ctx)}</UITooltipTrigger>;
}

/** Renders the tooltip content popup. */
export function TooltipContent({ props, nodes }: TooltipContentProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const align = resolveXmlString(props, 'align', ctx, 'center');
    const alignOffset = resolveXmlString(props, 'alignOffset', ctx, '0');
    const children = nodes;
    const hidden = resolveXmlBoolean(props, 'hidden', ctx);
    const side = resolveXmlString(props, 'side', ctx, 'top');
    const sideOffset = resolveXmlString(props, 'sideOffset', ctx, '4');

    return (
        <UITooltipContent
            align={align as never}
            alignOffset={alignOffset as never}
            hidden={hidden}
            side={side as never}
            sideOffset={sideOffset as never}
        >
            {renderNode(children ?? [], ctx)}
        </UITooltipContent>
    );
}
