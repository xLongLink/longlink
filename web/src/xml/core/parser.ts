import { Parser } from 'htmlparser2';
import type { ASTNode, ASTProps } from '../types';
import { compileAttribute } from '../expressions/compile';

/** Parses case-sensitive View markup without HTML tree repair or XML escaping requirements. */
export function parseView(source: string): ASTNode {
    const nodes: ASTNode[] = [];
    const stack: ASTNode[] = [];
    let params: ASTProps = {};
    let text = '';
    let cursor = 0;
    let selfClosingName: string | undefined;

    /** Reports malformed markup with its source position. */
    function invalid(message: string): never {
        // Locate the current parser event within the original source.
        const prefix = source.slice(0, parser.startIndex);
        const line = prefix.split('\n').length;
        const column = prefix.length - prefix.lastIndexOf('\n');

        throw new Error(`View is invalid at line ${line}, column ${column}: ${message}`);
    }

    /** Ensures the permissive parser has not discarded unmatched or incomplete markup. */
    function advance(): void {
        // Require contiguous source events so ignored markup cannot disappear.
        if (parser.startIndex !== cursor) invalid('Unexpected markup');
        cursor = parser.endIndex + 1;
    }

    /** Compiles adjacent text callbacks together, including decoded character references. */
    function flushText(): void {
        const value = text.trim();

        // Attach visible text to the current element or document root.
        if (value) {
            const children = stack.at(-1)?.children ?? nodes;
            children.push({ name: '$text', params: { value: compileAttribute(value) }, children: [] });
        }

        text = '';
    }

    // XML tokenization preserves casing and self-closing tags; it does not enforce XML entity escaping.
    const parser = new Parser(
        {
            onopentagname(name) {
                flushText();

                // Require component identifiers and reset attributes for each element.
                if (!/^[A-Za-z_][\w.-]*$/.test(name)) invalid('Invalid component name');
                params = {};
            },
            onattribute(name, value, quote) {
                const lowerName = name.toLowerCase();

                // Keep styling and executable callbacks under adapter control.
                if (['classname', 'style', 'xstyle'].includes(lowerName)) {
                    throw new Error(`${name} is not supported in Views`);
                }
                if (lowerName.startsWith('on')) {
                    throw new Error(`Event handler attribute "${name}" is not supported in Views`);
                }

                // Require unambiguous quoted attributes and reject duplicate names.
                if (!/^[A-Za-z_][\w.-]*$/.test(name)) invalid('Invalid attribute name');
                if (!/\s/.test(source[parser.startIndex - 1] ?? ''))
                    invalid('Attributes must be separated by whitespace');
                if (!quote) invalid(`Attribute "${name}" must have a quoted value`);
                if (Object.hasOwn(params, name)) invalid(`Duplicate attribute "${name}"`);
                params[name] = compileAttribute(value);
            },
            onopentag(name) {
                advance();
                selfClosingName = source.slice(parser.startIndex, cursor).endsWith('/>') ? name : undefined;

                // Preserve component nesting without browser HTML semantics.
                const node: ASTNode = { name, params, children: [] };
                const children = stack.at(-1)?.children ?? nodes;
                children.push(node);
                stack.push(node);
            },
            onclosetag(name, implied) {
                flushText();

                // Only self-closing syntax may trigger an implied closing callback.
                if (implied) {
                    if (selfClosingName !== name) {
                        invalid(`Missing closing tag for ${name}`);
                    }
                    selfClosingName = undefined;
                } else {
                    advance();
                    if (!/^<\/[A-Za-z_][\w.-]*\s*>$/.test(source.slice(parser.startIndex, cursor))) {
                        invalid('Invalid closing tag');
                    }
                }

                // Require exact, case-sensitive closing tags.
                if (stack.at(-1)?.name !== name) invalid(`Unexpected closing tag for ${name}`);
                stack.pop();
            },
            ontext(value) {
                advance();

                // Keep literal text escaping explicit; raw operators belong in quoted attributes.
                if (source.slice(parser.startIndex, cursor).includes('<')) invalid('Incomplete markup');
                text += value;
            },
            oncomment() {
                flushText();
                advance();

                // Reject unterminated comments instead of accepting parser recovery.
                if (!source.slice(parser.startIndex, cursor).endsWith('-->')) invalid('Unclosed comment');
            },
            onprocessinginstruction() {
                invalid('Declarations and processing instructions are not supported');
            },
            oncdatastart() {
                invalid('CDATA is not supported');
            },
            onend() {
                flushText();

                // Reject incomplete tags or ignored closing tags at the end of the document.
                if (cursor !== source.length || stack.length) invalid('Incomplete markup');
            },
        },
        { xmlMode: true, decodeEntities: true }
    );

    // Parse one document, then require its public View root.
    parser.end(source);
    const [root] = nodes;
    if (nodes.length !== 1 || root?.name !== 'longlink') {
        throw new Error('Views must contain exactly one longlink root');
    }

    return root;
}
