import {
    Tooltip as UITooltip,
    TooltipContent as UITooltipContent,
    TooltipProvider as UITooltipProvider,
    TooltipTrigger as UITooltipTrigger,
} from '@ui/tooltip';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML TooltipProvider component. */
export interface TooltipProviderProps {
    children?: ASTNode[];
}

/** Props accepted by the XML Tooltip component. */
export interface TooltipProps {
    children?: ASTNode[];
    defaultOpen?: boolean;
    open?: boolean;
}

/** Props accepted by the XML TooltipTrigger component. */
export interface TooltipTriggerProps {
    children?: ASTNode[];
}

/** Props accepted by the XML TooltipContent component. */
export interface TooltipContentProps {
    align?: string;
    alignOffset?: string | number;
    children?: ASTNode[];
    hidden?: boolean;
    side?: string;
    sideOffset?: string | number;
}

/** Renders the tooltip provider wrapper around descendant tooltips. */
export function TooltipProvider({ children }: TooltipProviderProps) {
    const { ctx } = useXmlContext();

    return <UITooltipProvider>{renderNode(children ?? [], ctx)}</UITooltipProvider>;
}

/** Renders the tooltip root shell. */
export function Tooltip({ children, defaultOpen, open }: TooltipProps) {
    const { ctx } = useXmlContext();

    return (
        <UITooltip defaultOpen={defaultOpen} open={open}>
            {renderNode(children ?? [], ctx)}
        </UITooltip>
    );
}

/** Renders the tooltip trigger slot. */
export function TooltipTrigger({ children }: TooltipTriggerProps) {
    const { ctx } = useXmlContext();

    return <UITooltipTrigger>{renderNode(children ?? [], ctx)}</UITooltipTrigger>;
}

/** Renders the tooltip content popup. */
export function TooltipContent({
    align = 'center',
    alignOffset = 0,
    children,
    hidden,
    side = 'top',
    sideOffset = 4,
}: TooltipContentProps) {
    const { ctx } = useXmlContext();

    return (
        <UITooltipContent align={align as never} alignOffset={alignOffset as never} hidden={hidden} side={side as never} sideOffset={sideOffset as never}>
            {renderNode(children ?? [], ctx)}
        </UITooltipContent>
    );
}
