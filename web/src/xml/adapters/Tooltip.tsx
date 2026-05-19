import {
    Tooltip as UITooltip,
    TooltipContent as UITooltipContent,
    TooltipProvider as UITooltipProvider,
    TooltipTrigger as UITooltipTrigger,
} from '@ui/tooltip';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlBoolean, resolveXmlString } from './props';

/** Renders the tooltip provider wrapper around descendant tooltips. */
export function TooltipProvider({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITooltipProvider>{renderNode(nodes, ctx)}</UITooltipProvider>;
}

/** Renders the tooltip root shell. */
export function Tooltip({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultOpen = resolveXmlBoolean(props, 'defaultOpen', ctx);
    const open = resolveXmlBoolean(props, 'open', ctx);

    return (
        <UITooltip defaultOpen={defaultOpen} open={open}>
            {renderNode(nodes, ctx)}
        </UITooltip>
    );
}

/** Renders the tooltip trigger slot. */
export function TooltipTrigger({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITooltipTrigger>{renderNode(nodes, ctx)}</UITooltipTrigger>;
}

/** Renders the tooltip content popup. */
export function TooltipContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const align = resolveXmlString(props, 'align', ctx, 'center');
    const alignOffset = resolveXmlString(props, 'alignOffset', ctx, '0');
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
            {renderNode(nodes, ctx)}
        </UITooltipContent>
    );
}
