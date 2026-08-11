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
    children?: ASTNode[];
};

/** Compiled XML attributes attached to an AST node. */
export type ASTProps = Record<string, ASTAttribute>;

/** Adapter surface used by XML-backed React components. */
export interface Props {
    props: ASTProps;
    nodes: ASTNode[];
}

/** XML runtime scope with lexical parent lookup. */
export type ExecutionContext = {
    translate?: TranslatorFn;
    translations?: Catalog;
    parent?: ExecutionContext;
    setups: Record<string, () => Promise<void> | void>;
    invalidate: (ids: string | string[]) => Promise<void>;
    values: Record<string, unknown>;
    [key: string]: unknown;
};
