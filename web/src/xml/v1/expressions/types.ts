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
    optional?: boolean;
};

type ChainExpressionNode = {
    type: 'ChainExpression';
    expression: ExpressionNode;
};

type CallExpressionNode = {
    type: 'CallExpression';
    callee: ExpressionNode;
    arguments: ExpressionNode[];
    optional?: boolean;
};

type ObjectExpressionNode = {
    type: 'ObjectExpression';
    properties: (
        | {
              type: 'Property';
              key: ExpressionNode;
              value: ExpressionNode;
          }
        | { type: 'SpreadElement' }
    )[];
};

type TemplateLiteralNode = {
    type: 'TemplateLiteral';
    quasis: { value: { cooked: string } }[];
    expressions: ExpressionNode[];
};

type BinaryExpressionNode = {
    type: 'BinaryExpression';
    operator: '+' | '-' | '*' | '/' | '%' | '**' | 'in' | '===' | '!==' | '==' | '!=' | '<' | '<=' | '>' | '>=';
    left: ExpressionNode;
    right: ExpressionNode;
};

type LogicalExpressionNode = {
    type: 'LogicalExpression';
    operator: '&&' | '||' | '??';
    left: ExpressionNode;
    right: ExpressionNode;
};

type UnaryExpressionNode = {
    type: 'UnaryExpression';
    operator: '!' | '+' | '-';
    argument: ExpressionNode;
};

type ConditionalExpressionNode = {
    type: 'ConditionalExpression';
    test: ExpressionNode;
    consequent: ExpressionNode;
    alternate: ExpressionNode;
};

type ArrayExpressionNode = {
    type: 'ArrayExpression';
    elements: (ExpressionNode | null)[];
};

export type ExpressionNode =
    | LiteralNode
    | IdentifierNode
    | MemberExpressionNode
    | ChainExpressionNode
    | CallExpressionNode
    | BinaryExpressionNode
    | LogicalExpressionNode
    | UnaryExpressionNode
    | ConditionalExpressionNode
    | ArrayExpressionNode
    | ObjectExpressionNode
    | TemplateLiteralNode;
