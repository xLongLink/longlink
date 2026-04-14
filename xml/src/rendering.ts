import React, { ReactNode, createElement } from 'react';
import { createPortal } from 'react-dom';
import { 
  JsonNode, 
  ComponentNode, 
  ComponentRegistry, 
  RenderContext,
  isPrimitiveNode,
  isArrayNode,
  FRAGMENT,
  PORTAL
} from './types';

/**
 * Renders a JSON node to a React element
 */
export function renderNode(
  node: JsonNode,
  registry: ComponentRegistry,
  context: RenderContext = {}
): ReactNode {
  // Handle primitives directly
  if (isPrimitiveNode(node)) {
    return node;
  }
  
  // Handle arrays
  if (isArrayNode(node)) {
    return node.map((child, index) => {
      // Add stable keys to array children to avoid React warnings
      const element = renderNode(child, registry, context);
      
      // For component nodes, the key is already handled in renderComponentNode
      return element;
    });
  }
  
  // From here, we know it's a ComponentNode
  return renderComponentNode(node, registry, context);
}

/**
 * Renders a component node to a React element
 */
function renderComponentNode(
  node: ComponentNode,
  registry: ComponentRegistry,
  context: RenderContext = {}
): ReactNode {
  // Check if the node type exists in the registry
  const component = registry[node.type];
  if (!component) {
    console.warn(`Unknown component type: ${node.type}`);
    return null;
  }
  
  // Use id as fallback for key
  if (node.props?.key === undefined && node.props?.id !== undefined) {
    node.props.key = node.props.id;
  }
  
  // Handle special component types
  if (node.type === FRAGMENT) {
    return React.createElement(
      React.Fragment,
      node.props,
      renderNodeChildren(node.children, registry, context)
    );
  }
  
  if (node.type === PORTAL) {
    const target = typeof node.props?.container === 'string'
      ? document.querySelector(node.props.container)
      : node.props?.container || document.body;
      
    return createPortal(
      renderNodeChildren(node.children, registry, context),
      target,
      node.props?.key
    );
  }
  
  // Create the React element
  return createElement(
    component,
    node.props,
    renderNodeChildren(node.children, registry, context)
  );
}

/**
 * Renders children nodes
 */
function renderNodeChildren(
  children: JsonNode | JsonNode[] | undefined,
  registry: ComponentRegistry,
  context: RenderContext
): ReactNode {
  if (!children) {
    return null;
  }
  
  if (isArrayNode(children)) {
    return children.map((child, index) => {
      // Add stable keys to array children to avoid React warnings
      const element = renderNode(child, registry, context);
      
      // For component nodes, the key is already handled in renderComponentNode
      return element;
    });
  }
  
  return renderNode(children, registry, context);
}