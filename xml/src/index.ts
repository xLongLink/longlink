// Main entry point for React-JSONR
export { renderNode } from './rendering';
export { transformJsonTree, traverseJsonTree } from './transformation';
export { createRegistry } from './registry';
export type { 
  JsonNode, 
  ComponentNode, 
  ComponentRegistry, 
  TransformVisitor, 
  TransformContext, 
  RenderContext 
} from './types';
export { 
  isComponentNode,
  isPrimitiveNode,
  isArrayNode,
  createComponentNode,
  createFragment,
  createPortal,
  FRAGMENT,
  PORTAL
} from './types';
export type { TraverseOptions } from './transformation'; 