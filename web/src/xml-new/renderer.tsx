import React from 'react';
import { Button, For, Input, Query, State, Text } from './components';
import type { XmlNode } from './types';

const registry: Record<string, React.ComponentType<any>> = {
    State,
    Query,
    Input,
    Button,
    For,
    Text,
};

/** Renders XML AST nodes into React elements. */
export function renderXml(nodes: XmlNode[]): React.ReactNode {
    return nodes.map((node, index) => <React.Fragment key={index}>{renderNode(node)}</React.Fragment>);
}

/** Renders a single XML node into a React element. */
export function renderNode(node: XmlNode): React.ReactNode {
    const Component = registry[node.tagName] ?? node.tagName;
    return React.createElement(Component as any, { props: node.attributes, children: node.children });
}
