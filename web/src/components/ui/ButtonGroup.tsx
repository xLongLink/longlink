import type { ReactNode } from 'react';
import { ButtonGroup as AstryxButtonGroup } from '@astryxdesign/core/ButtonGroup';

/** Groups related flat action buttons. */
export function ButtonGroup(props: {
    children?: ReactNode;
    label: string;
    orientation?: 'horizontal' | 'vertical';
    size?: 'sm' | 'md' | 'lg';
    isDisabled?: boolean;
}) {
    return <AstryxButtonGroup {...props} children={props.children} elevation="none" />;
}
