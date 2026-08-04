import type { Catalog, TranslatorFn } from '@astryxdesign/core/i18n';

/** A single node in the XML abstract syntax tree produced by the compiler. */
export type ASTNode = {
    name: string;
    params?: ASTProps;
    children?: ASTNode[];
};

/** Raw XML attributes attached to an AST node. */
export type ASTProps = Record<string, string>;

/** Native Astryx translation catalog loaded for one LongLink Application. */
export type XmlTranslations = Catalog;

/** Adapter surface used by XML-backed React components. */
export interface Props {
    props: ASTProps;
    nodes: ASTNode[];
}

/** Value shape accepted by XML form controls. */
export type XmlBindableValue = unknown;

/** XML runtime scope with lexical parent lookup. */
export type ExecutionContext = {
    translate?: TranslatorFn;
    translations?: XmlTranslations;
    parent?: ExecutionContext;
    setups: Record<string, () => Promise<void> | void>;
    invalidate: (ids: string | string[]) => Promise<void>;
    values: Record<string, unknown>;
    [key: string]: unknown;
};
