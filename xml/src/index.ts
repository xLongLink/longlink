export { xmlToAST as fromXml } from './compiler/parseXML';
export { renderNode } from './renderer/renderNode';
export { createContext } from './registry/createContext';
export { createRegistry } from './registry/createRegistry';
export { evaluate } from './runtime/evaluate';
export { interpolate } from './runtime/interpolate';
export type {
    ASTNode,
    ExecutionContext,
    PrimitiveComponent,
    PrimitiveProps,
    RegistryComponent,
    RegistryEntry,
    RegistryShape,
} from './types';
