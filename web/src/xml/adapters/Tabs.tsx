import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@ui/tabs';
import { useXmlContext } from '@xml/core/context';
import { evaluate } from '@xml/expressions';
import { renderNode } from '@xml/core/node';
import type { ASTNode, Props } from '@xml/types';
import { Fragment } from 'react';
import { requireXmlString, resolveXmlString } from './props';

type TabNode = {
    key: number;
    value: string;
    label: string;
    nodes: ASTNode[];
};

/** Renders a shadcn-backed tabs shell. */
export function Tabs({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultValue = resolveXmlString(props, 'defaultValue', ctx);
    const orientation = resolveXmlString(props, 'orientation', ctx, 'horizontal');
    const { tabs, passthroughNodes, initialValue } = collectTabNodes(nodes, ctx);
    const resolvedDefaultValue = defaultValue.trim() ? defaultValue : initialValue;

    return (
        <UITabs defaultValue={resolvedDefaultValue} orientation={orientation as never}>
            {tabs.length > 0 && (
                <UITabsList>
                    {tabs.map((tab) => (
                        <UITabsTrigger key={tab.key} value={tab.value}>
                            {tab.label}
                        </UITabsTrigger>
                    ))}
                </UITabsList>
            )}
            {tabs.map((tab) => (
                <UITabsContent key={tab.key} value={tab.value} className="flex flex-1 flex-col gap-6 text-sm outline-none">
                    {renderNode(tab.nodes, ctx)}
                </UITabsContent>
            ))}
            {passthroughNodes.map((node, index) => (
                <Fragment key={`passthrough-${index}`}>{renderNode([node], ctx)}</Fragment>
            ))}
        </UITabs>
    );
}

/** Renders a tab panel when used standalone. */
export function Tab({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <>{renderNode(nodes, ctx)}</>;
}

/** Collects tab markers from immediate children. */
function collectTabNodes(nodes: ASTNode[], ctx: ReturnType<typeof useXmlContext>['ctx']): {
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

        if (node.params?.if != null && !evaluate(node.params.if, ctx)) {
            return;
        }

        const value = requireXmlString(node.params, 'value', ctx, 'Tab');
        const label = requireXmlString(node.params, 'label', ctx, 'Tab');

        tabs.push({
            key: index,
            value,
            label,
            nodes: node.children ?? [],
        });
    });

    return {
        tabs,
        passthroughNodes,
        initialValue: tabs[0]?.value,
    };
}
