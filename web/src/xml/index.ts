export { compile as compileExpression, evaluate } from '@xml/expressions';
export { parseXML as fromXml } from '@xml/parser';
export { registry } from '@xml/registry';
export { initContext as initializeContext, render, renderNode } from '@xml/renderers';
export { BaseUrlContext, RuntimeContext, RuntimeProvider, resolveUrl, useContext, useUrl } from '@xml/runtime';
export type {
    ASTNode,
    ExecutionContext,
    RegistryComponent,
    RenderableASTNode,
    XMLComponent,
    XmlRegistryComponent,
} from '@xml/types';
