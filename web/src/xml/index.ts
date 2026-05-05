export { xmlToAST as fromXml } from './compiler';
export { createContext, registry } from './registry';
export { render, renderNode, renderXml } from './renderers';
export { RuntimeContext, RuntimeProvider, evaluate, resolveBinding, resolveCondition, useContext } from './runtime';
export type {
    ASTNode,
    ExecutionContext,
    RegistryComponent,
    RenderableASTNode,
    RuntimeOptions,
    RuntimeState,
    XmlComponentProps,
    XmlRegistryComponent,
} from './types';
