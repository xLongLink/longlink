export { compile as compileExpression, evaluate } from '@xml/core/expressions';
export { renderNode } from '@xml/core/node';
export { parseXML as fromXml } from '@xml/core/parser';
export { RuntimeContext, RuntimeProvider, useContext } from '@xml/core/context';
export { BaseUrlContext, resolveUrl, useUrl } from '@xml/core/url';
export type { ASTNode, ExecutionContext } from '@xml/types';
export { RenderXML } from './renderers.tsx';
