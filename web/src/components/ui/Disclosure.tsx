import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/Collapsible';

/** Custom initially-open disclosure with persistent content and controlled-close focus recovery. */
export function Disclosure(props: {
    children?: ReactNode;
    trigger: ReactNode;
    defaultIsOpen?: boolean;
    isOpen?: boolean;
    isDisabled?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}) {
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);

    // Controlled closes must not leave keyboard focus inside a hidden panel.
    useLayoutEffect(() => {
        const content = panel.current;

        if (props.isOpen === false && content?.contains(content.ownerDocument.activeElement)) {
            trigger.current?.focus();
        }
    }, [props.isOpen]);

    // Default the uncontrolled state without overriding controlled visibility.
    return (
        <Collapsible
            open={props.isOpen}
            defaultOpen={props.defaultIsOpen ?? true}
            disabled={props.isDisabled ?? false}
            onOpenChange={(open) => props.onOpenChange?.(open)}
            className="w-full"
        >
            <CollapsibleTrigger ref={trigger} type="button" className="view-disclosure-trigger">
                <span className="min-w-0 flex-1">{props.trigger}</span>
                <ChevronDown aria-hidden="true" className="view-disclosure-chevron" />
            </CollapsibleTrigger>
            <CollapsibleContent ref={panel} keepMounted className="view-disclosure-content">
                {props.children}
            </CollapsibleContent>
        </Collapsible>
    );
}
