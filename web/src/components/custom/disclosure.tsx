import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/shadcn/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/shadcn/collapsible';

/** Custom initially-open disclosure with persistent content and controlled-close focus recovery. */
export function Disclosure(props: {
    children?: ReactNode;
    trigger: ReactNode;
    defaultOpen?: boolean;
    open?: boolean;
    disabled?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}) {
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);

    // Controlled closes must not leave keyboard focus inside a hidden panel.
    useLayoutEffect(() => {
        const content = panel.current;

        if (props.open === false && content?.contains(content.ownerDocument.activeElement)) {
            trigger.current?.focus();
        }
    }, [props.open]);

    // Default the uncontrolled state without overriding controlled visibility.
    return (
        <Collapsible
            open={props.open}
            defaultOpen={props.defaultOpen ?? true}
            disabled={props.disabled}
            onOpenChange={(open) => props.onOpenChange?.(open)}
            className="w-full"
        >
            <CollapsibleTrigger
                ref={trigger}
                render={<Button type="button" variant="ghost" className="group w-full justify-between" />}
            >
                <span className="min-w-0">{props.trigger}</span>
                <ChevronDown
                    aria-hidden="true"
                    className="transition-transform duration-200 group-data-panel-open:rotate-180 motion-reduce:transition-none"
                />
            </CollapsibleTrigger>
            <CollapsibleContent ref={panel} keepMounted className="pt-2">
                {props.children}
            </CollapsibleContent>
        </Collapsible>
    );
}
