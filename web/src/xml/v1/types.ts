import type { Catalog, TranslatorFn } from '@astryxdesign/core/i18n';
import type { ExpressionNode } from './expressions/types';

export type ASTAttribute =
    | { kind: 'text'; value: string }
    | { kind: 'path'; parts: string[]; isBinding: boolean }
    | { kind: 'expression'; node: ExpressionNode }
    | { kind: 'interpolation'; segments: ASTInterpolationSegment[] };

export type ASTInterpolationSegment = { kind: 'text'; value: string } | { kind: 'expression'; node: ExpressionNode };

/** A single node in the XML abstract syntax tree produced by the compiler. */
export type ASTNode = {
    name: string;
    params?: ASTProps;
    children: ASTNode[];
};

/** Compiled XML attributes attached to an AST node. */
export type ASTProps = Record<string, ASTAttribute>;

/** Adapter surface used by XML-backed React components. */
export interface Props {
    props: ASTProps;
    nodes: ASTNode[];
}

/** XML lexical scope with local bindings and parent lookup. */
export type Scope = {
    parent?: Scope;
    bindings: Record<string, unknown>;
};

/** Renderer and host services available to the XML runtime. */
export type RuntimeServices = {
    invalidate: (ids: string | string[]) => Promise<void>;
    navigationBaseUrl: string;
    requestBaseUrl: string;
    setups: Record<string, () => Promise<void> | void>;
    translate?: TranslatorFn;
    translations?: Catalog;
};

/** Complete XML runtime with separately-owned lexical and service state. */
export type XmlRuntime = {
    scope: Scope;
    services: RuntimeServices;
};
