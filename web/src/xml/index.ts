export { xmlToAST as fromXml } from './compiler';
export { renderNode, render } from './renderers';
export { createContext, action, createRegistry, registry } from './registry';
export { evaluate, interpolate, resolveSet, useRuntime } from './runtime';
export type {
    ASTNode,
    ExecutionContext,
    RegistryComponent,
    RegistryShape,
    RenderableASTNode,
    RuntimeState,
    ActionHandler,
    ActionProps,
    ActionComponentProps,
} from './types';
