import type React from 'react';
import Button from '@/components/viavai/Button';
import Columns, { Column } from '@/components/viavai/Columns';
import Dialog from '@/components/viavai/Dialog';
import Hero from '@/components/viavai/Hero';
import Layout from '@/components/viavai/Layout';
import Menu, { MenuSection, MenuSubSection } from '@/components/viavai/Menu';
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
    menu: Menu,
    menusection: MenuSection,
    menuSubSection: MenuSubSection,
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
