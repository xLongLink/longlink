import type { ReactNode } from 'react';

type LayoutProps = {
    children?: ReactNode;
};

export function Layout({ children }: LayoutProps) {
    return <div className="space-y-4">{children}</div>;
}

export default Layout;
