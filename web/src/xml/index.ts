export { xmlToAST as fromXml } from './compiler';
export { createContext, registry } from './registry';
export { render, renderXml } from './renderers';
export {
    RuntimeContext,
    RuntimeProvider,
    evaluate,
    resolveBinding,
    resolveCondition,
    useContext,
    useProps,
} from './runtime';
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
