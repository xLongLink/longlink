/** Returns true when the input is wrapped in braces. */
export function isExpression(expr: string): boolean {
    const input = expr.trim();

    return input.startsWith('{') && input.endsWith('}');
}

/** Returns true when the input is a `$`-prefixed reference path. */
export function isReference(expr: string): boolean {
    const input = expr.trim();

    return /^\$[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(input);
}

/** Returns true when the input is a simple text string. */
export function isText(expr: string): boolean {
    const input = expr.trim();

    return input === '' || (!isExpression(input) && !isReference(input));
}
