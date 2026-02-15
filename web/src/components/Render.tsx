import type React from 'react';
import Button from '@/components/viavai/Button';
import Column from '@/components/viavai/Column';
import Columns from '@/components/viavai/Columns';
import Dialog from '@/components/viavai/Dialog';
import Hero from '@/components/viavai/Hero';
import Layout from '@/components/viavai/Layout';
import Separator from '@/components/viavai/Separator';
import Table from '@/components/viavai/Table';
import Tabs, { Tab } from '@/components/viavai/Tabs';

const registry = {
    hero: Hero,
    layout: Layout,
    dialog: Dialog,
    button: Button,
    table: Table,
    columns: Columns,
    column: Column,
    separator: Separator,
    tabs: Tabs,
    tab: Tab,
};

type Registry = typeof registry;
export type RegistryKey = keyof Registry;

export type RenderNodeSchema = {
    type: RegistryKey;
    props?: Record<string, unknown>;
    children?: RenderNodeSchema[] | RenderNodeSchema;
};

function isRenderNodeSchema(value: unknown): value is RenderNodeSchema {
    if (!value || typeof value !== 'object') {
        return false;
    }

    return 'type' in value;
}

function normalizeChildren(
    children?: RenderNodeSchema[] | RenderNodeSchema
): RenderNodeSchema[] {
    if (!children) {
        return [];
    }

    if (Array.isArray(children)) {
        return children.filter(isRenderNodeSchema);
    }

    return isRenderNodeSchema(children) ? [children] : [];
}

function Render({ type, props, children }: RenderNodeSchema) {
    const resolvedChildren = normalizeChildren(children);

    if (type === 'button') {
        const dialogChild = resolvedChildren.find(
            (child) => child.type === 'dialog'
        );

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
                    {normalizeChildren(dialogChild.children).map(
                        (child, index) => (
                            <Render key={index} {...child} />
                        )
                    )}
                </Dialog>
            );
        }
    }

    const Component = registry[type] as React.ComponentType<
        Record<string, unknown>
    >;

    return (
        <Component {...props}>
            {resolvedChildren.map((child, i) => (
                <Render key={i} {...child} />
            ))}
        </Component>
    );
}

export default Render;
