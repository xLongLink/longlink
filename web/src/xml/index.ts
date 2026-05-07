export { compile as compileExpression, evaluate } from '@xml/core/expressions';
export { renderNode } from '@xml/core/node';
export { parseXML as fromXml } from '@xml/core/parser';
export { RuntimeContext, RuntimeProvider, useContext } from '@xml/core/runtime';
export { BaseUrlContext, resolveUrl, useUrl } from '@xml/core/url';
export { registry } from '@xml/registry';
export type {
    ASTNode,
    ExecutionContext,
    RegistryComponent,
    RenderableASTNode,
    XMLComponent,
    XmlRegistryComponent,
} from '@xml/types';
export { RenderXML, render } from './renderers.tsx';
