import type { ReactNode } from 'react';
import { Collapsible as AstryxCollapsible } from '@astryxdesign/core/Collapsible';

/** Shows or hides content using controlled or initially open state. */
export function Collapsible(props: {
    children?: ReactNode;
    trigger: ReactNode;
    defaultIsOpen?: boolean;
    isOpen?: boolean;
    isDisabled?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}) {
    // Default the uncontrolled state without overriding controlled visibility.
    return (
        <AstryxCollapsible
            {...props}
            defaultIsOpen={props.defaultIsOpen ?? true}
            isDisabled={props.isDisabled ?? false}
        />
    );
}
