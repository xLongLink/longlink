import type { ComponentProps, ReactNode } from 'react';
import { Divider as AstryxDivider } from '@astryxdesign/core/Divider';

type DividerProps = Omit<ComponentProps<typeof AstryxDivider>, 'children' | 'label'> & { children?: ReactNode };

/** Renders a divider whose centered label is supplied as children. */
export function Divider({ children, ...props }: DividerProps) {
    return <AstryxDivider {...props} label={children} />;
}
