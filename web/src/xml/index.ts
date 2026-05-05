export { xmlToAST as fromXml } from './compiler';
export { createContext, registry } from './registry';
export { render, renderNode } from './renderers';
export { RuntimeProvider, evaluate, interpolate, resolveSet, useRuntime } from './runtime';
export type {
    ASTNode,
    ExecutionContext,
    RegistryComponent,
    RegistryShape,
    RenderableASTNode,
    RuntimeState,
} from './types';
