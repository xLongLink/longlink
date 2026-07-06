export { compile } from './compile';
export { evaluate } from './evaluate';
export { createScopeProxy, isSafePropertyName, readSafeProperty, resolvePath, resolveValue } from './resolve';
export type { ExpressionNode, ExpressionResolver } from './types';
export { isExpression, isReference, isText } from './utils';
