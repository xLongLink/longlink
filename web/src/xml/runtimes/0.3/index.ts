/** Astryx version implemented by this adapter set. */
export const XML_RUNTIME_VERSION = '0.3';

export { createContext } from './core/context';
export { parseXML } from './core/parser';
export { resolveRequestUrl } from './core/url';
export { RenderXML } from './renderers';
export type { ASTNode, RuntimeServices, Scope, XmlRuntime } from './types';
