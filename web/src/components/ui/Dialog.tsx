import type { ReactNode } from 'react';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Dialog as AstryxDialog } from '@astryxdesign/core/Dialog';

/** Displays an accessible modal with an explicit purpose and controlled visibility. */
export function Dialog(props: {
    children?: ReactNode;
    'aria-label': string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    purpose?: 'form' | 'info' | 'required';
}) {
    // Keep modal content inside a scroll region bounded by the View's viewport.
    return (
        <AstryxDialog {...props} purpose={props.purpose ?? 'info'} padding={0}>
            <Layout height="fill">
                <LayoutContent padding={4}>{props.children}</LayoutContent>
            </Layout>
        </AstryxDialog>
    );
}
