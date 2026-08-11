export const XML_SYNTAX_VERSION = 'v1';

export { createContext } from './core/context';
export { parseXML } from './core/parser';
export { resolveRequestUrl } from './core/url';
export { RenderXML } from './renderers';
export type { ASTNode, RuntimeServices, Scope, XmlRuntime } from './types';
