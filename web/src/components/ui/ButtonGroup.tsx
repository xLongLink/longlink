import type { ReactNode } from 'react';
import { ButtonGroup as AstryxButtonGroup } from '@astryxdesign/core/ButtonGroup';

/** Groups related flat action buttons. */
export function ButtonGroup(props: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    children?: ReactNode;
    label: string;
    orientation?: 'horizontal' | 'vertical';
    size?: 'sm' | 'md' | 'lg';
    isDisabled?: boolean;
}) {
    // Keep grouped actions horizontal, medium-sized, and enabled by default.
    return (
        <AstryxButtonGroup
            {...props}
            className={props.hidden ? 'hidden!' : undefined}
            children={props.children}
            orientation={props.orientation ?? 'horizontal'}
            isDisabled={props.isDisabled ?? false}
            elevation="none"
        />
    );
}
