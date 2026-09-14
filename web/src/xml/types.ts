import type { Expression } from 'acorn';
import type { ComponentType } from 'react';

export type ASTAttribute =
    | { kind: 'text'; value: string }
    | { kind: 'path'; parts: [string, ...string[]]; isBinding?: true }
    | { kind: 'expression'; node: Expression }
    | {
          kind: 'interpolation';
          segments: Array<{ kind: 'text'; value: string } | { kind: 'expression'; node: Expression }>;
      };

/** A single node in the XML abstract syntax tree produced by the compiler. */
export type ASTNode = {
    name: string;
    params: ASTProps;
    children: ASTNode[];
};

/** Compiled XML attributes attached to an AST node. */
export type ASTProps = Record<string, ASTAttribute>;

/** Adapter surface used by XML-backed React components. */
export interface Props {
    props: ASTProps;
    nodes: ASTNode[];
}

/** XML element adapters available to one runtime. */
export type XmlComponentRegistry = Record<string, ComponentType<Props>>;

/** XML lexical scope with local bindings and parent lookup. */
export type Scope = {
    parent?: Scope;
    bindings: Record<string, unknown>;
    registry?: XmlComponentRegistry;
};

/** Renderer and host services available to the XML runtime. */
export type RuntimeServices = {
    invalidate: (id: string) => Promise<void>;
    navigate: (url: string) => void;
    navigationBaseUrl: string;
    requestCompleted?: (url: string) => Promise<void>;
    requestBaseUrl: string;
    setups: Record<string, () => Promise<void> | void>;
};

/** Complete XML runtime with separately-owned lexical and service state. */
export type XmlRuntime = {
    scope: Scope;
    services: RuntimeServices;
};
