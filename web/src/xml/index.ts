export { Context, ContextProvider, createContext, useContext } from '@xml/core/context';
export { compile as compileExpression, evaluate } from '@xml/core/expressions';
export { renderNode } from '@xml/core/node';
export { parseXML as fromXml } from '@xml/core/parser';
export { BaseUrlContext, resolveUrl, useUrl } from '@xml/core/url';
export type { ASTNode, ExecutionContext } from '@xml/types';
export { RenderXML } from './renderers.tsx';
