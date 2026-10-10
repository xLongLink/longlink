import type { ReactNode } from 'react';
import { Collapsible as AstryxCollapsible } from '@astryxdesign/core/Collapsible';

/** Shows or hides content using controlled or initially open state. */
export function Collapsible(props: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
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
            className={props.hidden ? 'hidden!' : undefined}
            defaultIsOpen={props.defaultIsOpen ?? true}
            isDisabled={props.isDisabled ?? false}
        />
    );
}
