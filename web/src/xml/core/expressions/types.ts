import type { ExecutionContext } from '@xml/types';

export type ExpressionResolver<T = unknown> = (ctx: ExecutionContext) => T;

type LiteralNode = {
    type: 'Literal';
    value: unknown;
};

type IdentifierNode = {
    type: 'Identifier';
    name: string;
};

type MemberExpressionNode = {
    type: 'MemberExpression';
    object: ExpressionNode;
    property: ExpressionNode;
    computed: boolean;
};

type ObjectExpressionNode = {
    type: 'ObjectExpression';
    properties: Array<
        | {
              type: 'Property';
              key: ExpressionNode;
              value: ExpressionNode;
              shorthand: boolean;
          }
        | { type: 'SpreadElement'; argument: ExpressionNode }
    >;
};

type TemplateLiteralNode = {
    type: 'TemplateLiteral';
    quasis: Array<{ value: { cooked: string } }>;
    expressions: ExpressionNode[];
};

type BinaryExpressionNode = {
    type: 'BinaryExpression';
    operator: '+' | '-' | '*' | '/';
    left: ExpressionNode;
    right: ExpressionNode;
};

type ArrayExpressionNode = {
    type: 'ArrayExpression';
    elements: Array<ExpressionNode | null>;
};

export type ExpressionNode =
    | LiteralNode
    | IdentifierNode
    | MemberExpressionNode
    | BinaryExpressionNode
    | ArrayExpressionNode
    | ObjectExpressionNode
    | TemplateLiteralNode;
