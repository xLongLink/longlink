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

type ChainExpressionNode = {
    type: 'ChainExpression';
    expression: ExpressionNode;
};

type CallExpressionNode = {
    type: 'CallExpression';
    callee: ExpressionNode;
    arguments: ExpressionNode[];
};

type ObjectExpressionNode = {
    type: 'ObjectExpression';
    properties: {
        type: 'Property';
        key: ExpressionNode;
        value: ExpressionNode;
    }[];
};

type TemplateLiteralNode = {
    type: 'TemplateLiteral';
    quasis: { value: { cooked: string } }[];
    expressions: ExpressionNode[];
};

type BinaryExpressionNode = {
    type: 'BinaryExpression';
    operator: '+' | '-' | '*' | '/' | '%' | '**' | '===' | '!==' | '<' | '<=' | '>' | '>=';
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

export type ExpressionNode =
    | LiteralNode
    | IdentifierNode
    | MemberExpressionNode
    | ChainExpressionNode
    | CallExpressionNode
    | BinaryExpressionNode
    | LogicalExpressionNode
    | UnaryExpressionNode
    | ObjectExpressionNode
    | TemplateLiteralNode;
