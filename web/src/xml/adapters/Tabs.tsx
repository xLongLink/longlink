import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@/components/ui/tabs';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import { evaluate } from '@/xml/expressions';
import type { ASTNode, Props } from '@/xml/types';
import { Fragment, type ComponentProps } from 'react';
import { Icon } from './Icon';
import { requireXmlString, resolveXmlString } from './props';

type TabsOrientation = NonNullable<ComponentProps<typeof UITabs>['orientation']>;

type TabNode = {
    key: number;
    value: string;
    label: string;
    icon?: string;
    nodes: ASTNode[];
};

/** Renders a shadcn-backed tabs shell. */
export function Tabs({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultValue = resolveXmlString(props, 'defaultValue', ctx);
    const orientation = resolveTabsOrientation(resolveXmlString(props, 'orientation', ctx, 'horizontal'));
    const { tabs, passthroughNodes, initialValue } = collectTabNodes(nodes, ctx);
    const resolvedDefaultValue = defaultValue.trim() ? defaultValue : initialValue;

    return (
        <UITabs defaultValue={resolvedDefaultValue} orientation={orientation}>
            {tabs.length > 0 && (
                <UITabsList>
                    {tabs.map((tab) => (
                        <UITabsTrigger key={tab.key} value={tab.value}>
                            {tab.icon ? <Icon props={{ name: tab.icon }} nodes={[]} /> : null}
                            {tab.label}
                        </UITabsTrigger>
                    ))}
                </UITabsList>
            )}
            {tabs.map((tab) => (
                <UITabsContent
                    key={tab.key}
                    value={tab.value}
                    className="flex flex-1 flex-col gap-6 text-sm outline-none"
                >
                    {renderNode(tab.nodes, ctx)}
                </UITabsContent>
            ))}
            {passthroughNodes.map((node, index) => (
                <Fragment key={`passthrough-${index}`}>{renderNode([node], ctx)}</Fragment>
            ))}
        </UITabs>
    );
}

/** Resolves a validated XML tabs orientation. */
function resolveTabsOrientation(value: string): TabsOrientation {
    // Accept only orientations supported by the UI component.
    switch (value) {
        case 'horizontal':
        case 'vertical':
            return value;
        default:
            throw new Error(`Unsupported Tabs orientation '${value}'`);
    }
}

/** Renders a tab panel when used standalone. */
export function Tab({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <>{renderNode(nodes, ctx)}</>;
}

/** Collects tab markers from immediate children. */
function collectTabNodes(
    nodes: ASTNode[],
    ctx: ReturnType<typeof useXmlContext>['ctx']
): {
    tabs: TabNode[];
    passthroughNodes: ASTNode[];
    initialValue?: string;
} {
    const tabs: TabNode[] = [];
    const passthroughNodes: ASTNode[] = [];

    nodes.forEach((node, index) => {
        // Keep non-tab nodes available so mixed content still renders.
        if (node.name !== 'Tab') {
            passthroughNodes.push(node);
            return;
        }

        // Skip tabs hidden by XML conditions.
        if (node.params?.if != null && !evaluate(node.params.if, ctx)) {
            return;
        }

        const params = node.params ?? {};
        const value = requireXmlString(params, 'value', ctx, 'Tab');
        const label = params.i18n ? resolveTranslation(params, ctx) : requireXmlString(params, 'label', ctx, 'Tab');
        const icon = resolveXmlString(params, 'icon', ctx);

        tabs.push({
            key: index,
            value,
            label,
            icon: icon.trim() ? icon : undefined,
            nodes: node.children ?? [],
        });
    });

    return {
        tabs,
        passthroughNodes,
        initialValue: tabs[0]?.value,
    };
}
