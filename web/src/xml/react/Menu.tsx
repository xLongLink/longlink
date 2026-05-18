import {
    Menu as UIMenu,
    MenuContent as UIMenuContent,
    MenuList as UIMenuList,
    MenuSection as UIMenuSection,
    MenuSubSection as UIMenuSubSection,
} from '@ui/menu';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { useEffect, useState } from 'react';

/** Props accepted by the XML Menu component. */
export interface MenuProps {
    children?: ASTNode[];
    defaultValue?: string;
    value?: string;
}


/** Props accepted by the XML MenuList component. */
export interface MenuListProps {
    children?: ASTNode[];
}


/** Props accepted by the XML MenuSection component. */
export interface MenuSectionProps {
    children?: ASTNode[];
    value?: string;
    label?: string;
    disabled?: boolean;
}


/** Props accepted by the XML MenuSubSection component. */
export interface MenuSubSectionProps {
    children?: ASTNode[];
    value?: string;
    label?: string;
    disabled?: boolean;
}


/** Props accepted by the XML MenuContent component. */
export interface MenuContentProps {
    children?: ASTNode[];
    value?: string;
    className?: string;
}

/** Renders the sidebar-style menu shell. */
export function Menu({ children, defaultValue, value }: MenuProps) {
    const { ctx } = useXmlContext();
    const [activeValue, setActiveValue] = useState<string>(value ?? defaultValue ?? '');

    // Keep the XML wrapper in sync with an explicit menu value when one is provided.
    useEffect(() => {
        if (value !== undefined) {
            setActiveValue(value);
        }
    }, [value]);

    return (
        <UIMenu value={activeValue} onValueChange={setActiveValue}>
            {renderNode(children ?? [], ctx)}
        </UIMenu>
    );
}


/** Renders the menu list slot. */
export function MenuList({ children }: MenuListProps) {
    const { ctx } = useXmlContext();

    return <UIMenuList>{renderNode(children ?? [], ctx)}</UIMenuList>;
}


/** Renders a root menu section. */
export function MenuSection({ children, value, label, disabled }: MenuSectionProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('MenuSection requires a value');

    return (
        <UIMenuSection disabled={disabled} label={label} value={value}>
            {renderNode(children ?? [], ctx)}
        </UIMenuSection>
    );
}


/** Renders a nested menu subsection. */
export function MenuSubSection({ children, value, label, disabled }: MenuSubSectionProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('MenuSubSection requires a value');

    return (
        <UIMenuSubSection disabled={disabled} label={label} value={value}>
            {renderNode(children ?? [], ctx)}
        </UIMenuSubSection>
    );
}


/** Renders the active menu content panel. */
export function MenuContent({ children, value, className }: MenuContentProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('MenuContent requires a value');

    return (
        <UIMenuContent className={className} value={value}>
            {renderNode(children ?? [], ctx)}
        </UIMenuContent>
    );
}
