import type React from 'react';
import Button from '@/longlink/Button';
import Checkbox from '@/longlink/Checkbox';
import Columns, { Column } from '@/longlink/Columns';
import Dialog from '@/longlink/Dialog';
import Hero from '@/longlink/Hero';
import Input from '@/longlink/Input';
import Menu, { MenuSection, MenuSubSection } from '@/longlink/Menu';
import Range from '@/longlink/Range';
import Separator from '@/longlink/Separator';
import Select from '@/longlink/Select';
import Switch from '@/longlink/Switch';
import Table, { type ApiTableColumn } from '@/longlink/Table';
import Textarea from '@/longlink/Textarea';
import Tabs, { Tab } from '@/longlink/Tabs';

const registry = {
    hero: Hero,
    dialog: Dialog,
    button: Button,
    table: Table,
    columns: Columns,
    column: Column,
    separator: Separator,
    tabs: Tabs,
    tab: Tab,
    menu: Menu,
    menusection: MenuSection,
    menuSubSection: MenuSubSection,
    input: Input,
    select: Select,
    switch: Switch,
    checkbox: Checkbox,
    range: Range,
    textarea: Textarea,
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

    if (type === 'menu') {
        return (
            <Menu>
                {resolvedChildren.map((section, sectionIndex) => {
                    if (section.type !== 'menusection') {
                        return <Render key={sectionIndex} {...section} />;
                    }

                    return (
                        <MenuSection
                            key={sectionIndex}
                            {...(section.props as React.ComponentProps<
                                typeof MenuSection
                            >)}
                        >
                            {normalizeChildren(section.children).map(
                                (subSection, subSectionIndex) => {
                                    if (subSection.type !== 'menuSubSection') {
                                        return (
                                            <Render
                                                key={subSectionIndex}
                                                {...subSection}
                                            />
                                        );
                                    }

                                    return (
                                        <MenuSubSection
                                            key={subSectionIndex}
                                            {...(subSection.props as React.ComponentProps<
                                                typeof MenuSubSection
                                            >)}
                                        >
                                            {normalizeChildren(
                                                subSection.children
                                            ).map((child, childIndex) => (
                                                <Render
                                                    key={childIndex}
                                                    {...child}
                                                />
                                            ))}
                                        </MenuSubSection>
                                    );
                                }
                            )}
                        </MenuSection>
                    );
                })}
            </Menu>
        );
    }

    if (type === 'table') {
        const columns: ApiTableColumn[] = resolvedChildren
            .filter((child) => child.type === 'column')
            .map((child) => ({
                key: String(child.props?.key ?? ''),
                label:
                    child.props?.label == null
                        ? undefined
                        : String(child.props.label),
                align:
                    child.props?.align == null
                        ? undefined
                        : (String(child.props.align) as
                              | 'left'
                              | 'center'
                              | 'right'),
                content: child.props?.content as ApiTableColumn['content'],
                detail: child.props?.detail as ApiTableColumn['detail'],
            }))
            .filter((column) => column.key);

        return (
            <Table
                data={
                    Array.isArray(props?.data) ? (props.data as object[]) : []
                }
                columns={columns}
            />
        );
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
