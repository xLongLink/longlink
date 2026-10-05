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
    return <AstryxCollapsible {...props} />;
}
