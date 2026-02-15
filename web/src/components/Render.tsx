import type React from 'react';
import Button from '@/components/viavai/Button';
import Columns from '@/components/viavai/Columns';
import Dialog from '@/components/viavai/Dialog';
import Hero from '@/components/viavai/Hero';
import Layout from '@/components/viavai/Layout';
import Separator from '@/components/viavai/Separator';
import Table from '@/components/viavai/Table';

const registry = {
    hero: Hero,
    layout: Layout,
    dialog: Dialog,
    button: Button,
    table: Table,
    columns: Columns,
    separator: Separator,
};

type Registry = typeof registry;
export type RegistryKey = keyof Registry;

export type RenderNodeSchema = {
    type: RegistryKey;
    props?: Record<string, unknown>;
    children?: RenderNodeSchema[];
};

function Render({ type, props, children }: RenderNodeSchema) {
    if (type === 'button') {
        const dialogChild = children?.find((child) => child.type === 'dialog');

        if (dialogChild) {
            const dialogProps =
                (dialogChild.props as { confirm?: string; cancel?: string }) ??
                {};

            return (
                <Dialog
                    trigger={
                        <Button
                            {...(props as React.ComponentProps<typeof Button>)}
                        />
                    }
                    confirm={dialogProps.confirm}
                    cancel={dialogProps.cancel}
                >
                    {dialogChild.children?.map((child, index) => (
                        <Render key={index} {...child} />
                    ))}
                </Dialog>
            );
        }
    }

    const Component = registry[type] as React.ComponentType<any>;

    return (
        <Component {...props}>
            {children?.map((child, i) => (
                <Render key={i} {...child} />
            ))}
        </Component>
    );
}

export default Render;
