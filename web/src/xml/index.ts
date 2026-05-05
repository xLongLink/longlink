export { xmlToAST as fromXml } from './compiler';
export { createContext, registry } from './registry';
export { render, renderNode } from './renderers';
export { RuntimeProvider, evaluate, interpolate, resolveValue, useRuntime } from './runtime';
export type { ASTNode, ExecutionContext, RegistryComponent, RenderableASTNode, RuntimeState } from './types';
