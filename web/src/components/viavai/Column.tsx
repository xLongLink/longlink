import type { ReactNode } from 'react';

type ColumnProps = {
    width?: number;
    children?: ReactNode;
};

export function Column({ children }: ColumnProps) {
    return <>{children}</>;
}

export default Column;
