import React, {
    Fragment,
    cloneElement,
    isValidElement,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import LegacyButton from '@/longlink/Button';
import LegacyCheckbox from '@/longlink/Checkbox';
import LegacyColumns, { Column as LegacyColumn } from '@/longlink/Columns';
import LegacyHero from '@/longlink/Hero';
import LegacyInput from '@/longlink/Input';
import LegacyMenu, { MenuSection as LegacyMenuSection, MenuSubSection as LegacyMenuSubSection } from '@/longlink/Menu';
import LegacyRange from '@/longlink/Range';
import LegacySelect from '@/longlink/Select';
import LegacySeparator from '@/longlink/Separator';
import LegacySwitch from '@/longlink/Switch';
import LegacyTable from '@/longlink/Table';
import LegacyTabs, { Tab as LegacyTab } from '@/longlink/Tabs';
import LegacyTextarea from '@/longlink/Textarea';
import { apiFetch } from '@/lib/api';
import { Button as UIButton } from '@/ui/button';
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/dialog';
import { Input as UIInput } from '@/ui/input';
import { Label } from '@/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { type ComponentNode, isComponentNode, isPrimitiveNode, type JsonNode } from '@/longlink/rendering';

type RenderNodeSchema = unknown;
const LEGACY_TYPES = new Set([
    'hero',
    'button',
    'table',
    'columns',
    'column',
    'tabs',
    'tab',
    'menu',
    'menusection',
    'menusubsection',
    'input',
    'select',
    'switch',
    'checkbox',
    'range',
    'textarea',
    'separator',
]);

type ScopeValue = Record<string, unknown>;
type StateRegistration = {
    setValue: React.Dispatch<React.SetStateAction<unknown>>;
};
type DialogRegistration = {
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setPayload: React.Dispatch<React.SetStateAction<unknown>>;
};

const ScopeContext = React.createContext<ScopeValue>({});
const StateRegistryContext = React.createContext<{
    register: (id: string, registration: StateRegistration) => () => void;
    updatePath: (path: string, value: unknown) => void;
}>({
    register: () => () => undefined,
    updatePath: () => undefined,
});
const DialogRegistryContext = React.createContext<{
    register: (id: string, registration: DialogRegistration) => () => void;
    openDialog: (id: string, payload?: unknown) => void;
    closeDialog: (id: string) => void;
}>({
    register: () => () => undefined,
    openDialog: () => undefined,
    closeDialog: () => undefined,
});

function normalizeType(type: string) {
    return type.trim().toLowerCase();
}

function asArray(children: JsonNode | JsonNode[] | undefined): JsonNode[] {
    if (children === undefined) {
        return [];
    }

    return Array.isArray(children) ? children : [children];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getByPath(source: unknown, path: string) {
    if (!path) {
        return source;
    }

    return path.split('.').reduce<unknown>((current, part) => {
        if (current == null) {
            return undefined;
        }

        if (Array.isArray(current) && /^\d+$/.test(part)) {
            return current[Number(part)];
        }

        if (typeof current === 'object') {
            return (current as Record<string, unknown>)[part];
        }

        return undefined;
    }, source);
}

function setByPath(source: unknown, path: string[], value: unknown): unknown {
    if (path.length === 0) {
        return value;
    }

    const [head, ...tail] = path;
    const base = isPlainObject(source) ? source : {};

    return {
        ...base,
        [head]: setByPath((base as Record<string, unknown>)[head], tail, value),
    };
}

function evaluateExpression(expression: string, scope: ScopeValue) {
    try {
        return Function('scope', `with (scope) { return (${expression}); }`)(scope) as unknown;
    } catch {
        return undefined;
    }
}

function stringifyValue(value: unknown) {
    if (value == null) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return JSON.stringify(value);
}

function resolveTemplates<T>(value: T, scope: ScopeValue): unknown {
    if (typeof value === 'string') {
        const exactMatch = value.match(/^\s*\{\{([\s\S]+)\}\}\s*$/);
        if (exactMatch) {
            return evaluateExpression(exactMatch[1].trim(), scope);
        }

        return value.replace(/\{\{([\s\S]+?)\}\}/g, (_, expression: string) =>
            stringifyValue(evaluateExpression(expression.trim(), scope))
        );
    }

    if (Array.isArray(value)) {
        return value.map((item) => resolveTemplates(item, scope));
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveTemplates(item, scope)]));
    }

    return value;
}

function parsePayload(value: unknown, scope: ScopeValue) {
    const resolved = resolveTemplates(value, scope);

    if (typeof resolved !== 'string') {
        return resolved;
    }

    const trimmed = resolved.trim();
    if (!trimmed) {
        return undefined;
    }

    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return resolved;
        }
    }

    return resolved;
}

function coerceXmlScalar(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    const lowered = trimmed.toLowerCase();

    if (lowered === 'true') {
        return true;
    }

    if (lowered === 'false') {
        return false;
    }

    if (lowered === 'null' || lowered === 'none') {
        return null;
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    if (/^-?\d+$/.test(trimmed)) {
        return Number.parseInt(trimmed, 10);
    }

    if (/^-?\d+\.\d+$/.test(trimmed)) {
        return Number.parseFloat(trimmed);
    }

    return value;
}

function normalizeXmlElement(name: string, value: unknown): ComponentNode {
    if (value == null || value === '') {
        return {
            type: name,
            props: {},
            children: [],
        };
    }

    if (!isPlainObject(value)) {
        return {
            type: name,
            props: {},
            children: [coerceXmlScalar(value) as JsonNode],
        };
    }

    const props: Record<string, unknown> = {};
    const children: JsonNode[] = [];

    for (const [key, item] of Object.entries(value)) {
        if (key === '#text') {
            const text = typeof item === 'string' ? item.trim() : item;
            if (text !== '' && text != null) {
                children.push(coerceXmlScalar(text) as JsonNode);
            }
            continue;
        }

        if (key.startsWith('@')) {
            props[key.slice(1)] = coerceXmlScalar(item);
            continue;
        }

        const childItems = Array.isArray(item) ? item : [item];
        for (const childItem of childItems) {
            children.push(normalizeXmlElement(key, childItem));
        }
    }

    return {
        type: name,
        props,
        children,
    };
}

export function normalizeRenderRoots(schema: unknown): JsonNode[] {
    if (schema == null) {
        return [];
    }

    if (Array.isArray(schema)) {
        return schema as JsonNode[];
    }

    if (isComponentNode(schema) || isPrimitiveNode(schema)) {
        return [schema as JsonNode];
    }

    if (!isPlainObject(schema)) {
        return [];
    }

    if ('Page' in schema) {
        return [normalizeXmlElement('Page', schema.Page)];
    }

    if ('page' in schema) {
        return [normalizeXmlElement('Page', schema.page)];
    }

    return [];
}

function px(value: unknown, fallback: number) {
    if (typeof value === 'number') {
        return `${value}px`;
    }

    if (typeof value === 'string' && value.trim()) {
        return /^\d+$/.test(value.trim()) ? `${value.trim()}px` : value;
    }

    return `${fallback}px`;
}

function keyForNode(node: JsonNode, index: number) {
    if (!isComponentNode(node)) {
        return index;
    }

    return String(node.props?.key ?? node.props?.id ?? index);
}

function extractStateDefaults(children: JsonNode[]) {
    const defaults: Record<string, unknown> = {};

    for (const child of children) {
        if (!isComponentNode(child) || normalizeType(child.type) !== 'field') {
            continue;
        }

        const name = typeof child.props?.name === 'string' ? child.props.name : undefined;
        const hasRenderableChildren = asArray(child.children).length > 0;
        const label = child.props?.label;

        if (name && !hasRenderableChildren && label == null) {
            defaults[name] = null;
        }
    }

    return defaults;
}

function filterStateDeclarations(children: JsonNode[]) {
    return children.filter((child) => {
        if (!isComponentNode(child) || normalizeType(child.type) !== 'field') {
            return true;
        }

        const hasRenderableChildren = asArray(child.children).length > 0;
        return child.props?.label != null || hasRenderableChildren;
    });
}

function useScope() {
    return React.useContext(ScopeContext);
}

function ScopeProvider({ value, children }: { value: ScopeValue; children?: ReactNode }) {
    const parent = useScope();
    const merged = useMemo(() => ({ ...parent, ...value }), [parent, value]);

    return <ScopeContext.Provider value={merged}>{children}</ScopeContext.Provider>;
}

function LegacyRender({ node }: { node: ComponentNode }) {
    const props = node.props ?? {};
    const children = <>{renderChildren(node.children)}</>;
    const type = normalizeType(node.type);

    if (type === 'hero') {
        return <LegacyHero {...(props as any)}>{children}</LegacyHero>;
    }

    if (type === 'button') {
        return <LegacyButton {...(props as any)}>{children}</LegacyButton>;
    }

    if (type === 'table') {
        return <LegacyTable {...(props as any)} />;
    }

    if (type === 'columns') {
        return <LegacyColumns {...(props as any)}>{children}</LegacyColumns>;
    }

    if (type === 'column') {
        return <LegacyColumn {...(props as any)}>{children}</LegacyColumn>;
    }

    if (type === 'tabs') {
        return <LegacyTabs {...(props as any)}>{children}</LegacyTabs>;
    }

    if (type === 'tab') {
        return <LegacyTab {...(props as any)}>{children}</LegacyTab>;
    }

    if (type === 'menu') {
        return <LegacyMenu>{children}</LegacyMenu>;
    }

    if (type === 'menusection') {
        return <LegacyMenuSection {...(props as any)}>{children}</LegacyMenuSection>;
    }

    if (type === 'menusubsection') {
        return <LegacyMenuSubSection {...(props as any)}>{children}</LegacyMenuSubSection>;
    }

    if (type === 'input') {
        return <LegacyInput {...props} />;
    }

    if (type === 'select') {
        return <LegacySelect {...props} />;
    }

    if (type === 'switch') {
        return <LegacySwitch {...props} />;
    }

    if (type === 'checkbox') {
        return <LegacyCheckbox {...props} />;
    }

    if (type === 'range') {
        return <LegacyRange {...props} />;
    }

    if (type === 'textarea') {
        return <LegacyTextarea {...props} />;
    }

    if (type === 'separator') {
        return <LegacySeparator />;
    }

    return null;
}

function PageNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const title = resolveTemplates(node.props?.title, scope);

    useEffect(() => {
        if (typeof title === 'string' && title.trim()) {
            document.title = title;
        }
    }, [title]);

    return <div className="space-y-6">{renderChildren(node.children)}</div>;
}

function StackNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const direction = String(resolveTemplates(node.props?.direction, scope) ?? 'column');
    const justify = String(resolveTemplates(node.props?.justify, scope) ?? 'start');
    const align = String(resolveTemplates(node.props?.align, scope) ?? 'stretch');

    return (
        <div
            className={`flex ${direction === 'row' ? 'flex-row' : 'flex-col'}`}
            style={{
                gap: px(resolveTemplates(node.props?.gap, scope), 16),
                justifyContent:
                    justify === 'between'
                        ? 'space-between'
                        : justify === 'center'
                          ? 'center'
                          : justify === 'end'
                            ? 'flex-end'
                            : 'flex-start',
                alignItems:
                    align === 'center'
                        ? 'center'
                        : align === 'end'
                          ? 'flex-end'
                          : align === 'start'
                            ? 'flex-start'
                            : 'stretch',
            }}
        >
            {renderChildren(node.children)}
        </div>
    );
}

function TextNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const variant = String(resolveTemplates(node.props?.variant, scope) ?? 'body');
    const content = renderChildren(node.children);

    if (variant === 'h2') {
        return <h2 className="text-2xl font-semibold">{content}</h2>;
    }

    if (variant === 'h4') {
        return <h4 className="text-base font-semibold">{content}</h4>;
    }

    if (variant === 'xl') {
        return <p className="text-3xl font-semibold">{content}</p>;
    }

    return <p className="text-sm text-foreground">{content}</p>;
}

function CardNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const title = resolveTemplates(node.props?.title, scope);

    return (
        <UICard>
            {typeof title === 'string' && title.trim() ? (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
            ) : null}
            <CardContent className="space-y-4">{renderChildren(node.children)}</CardContent>
        </UICard>
    );
}

function ColumnsNode({ node }: { node: ComponentNode }) {
    const scope = useScope();

    return (
        <div
            className="grid grid-cols-12"
            style={{
                gap: px(resolveTemplates(node.props?.gap, scope), 16),
            }}
        >
            {renderChildren(node.children)}
        </div>
    );
}

function ColumnNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const span = Number(resolveTemplates(node.props?.span, scope) ?? 1);

    return (
        <div
            className="space-y-4"
            style={{ gridColumn: `span ${Math.max(1, Math.min(12, span))} / span ${Math.max(1, Math.min(12, span))}` }}
        >
            {renderChildren(node.children)}
        </div>
    );
}

function FieldNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const label = resolveTemplates(node.props?.label, scope);

    if (label == null && asArray(node.children).length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            {typeof label === 'string' && label.trim() ? <Label>{label}</Label> : null}
            {renderChildren(node.children)}
        </div>
    );
}

function StateNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const registry = React.useContext(StateRegistryContext);
    const stateId = String(node.props?.id ?? '');
    const rawChildren = asArray(node.children);
    const defaultFields = useMemo(() => extractStateDefaults(rawChildren), [rawChildren]);
    const resolvedInit = resolveTemplates(node.props?.init, scope);
    const [value, setValue] = useState<unknown>(() => ({
        ...defaultFields,
        ...(isPlainObject(resolvedInit) ? resolvedInit : {}),
    }));

    useEffect(() => {
        if (!stateId) {
            return;
        }

        return registry.register(stateId, {
            setValue,
        });
    }, [registry, setValue, stateId]);

    if (!stateId) {
        return <>{renderChildren(filterStateDeclarations(rawChildren))}</>;
    }

    return (
        <ScopeProvider value={{ [stateId]: value }}>
            {renderChildren(filterStateDeclarations(rawChildren))}
        </ScopeProvider>
    );
}

function QueryNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const queryId = String(node.props?.id ?? '');
    const url = resolveTemplates(node.props?.url, scope);

    const { data } = useQuery({
        queryKey: ['longlink-query', queryId, url],
        queryFn: () => apiFetch(String(url)),
        enabled: Boolean(queryId && typeof url === 'string' && url.trim()),
    });

    if (!queryId) {
        return null;
    }

    return <ScopeProvider value={{ [queryId]: data }}>{renderChildren(node.children)}</ScopeProvider>;
}

function ForEachNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const items = resolveTemplates(node.props?.items, scope);
    const itemName = String(node.props?.item ?? 'item');
    const nodes = Array.isArray(items) ? items : [];

    return (
        <>
            {nodes.map((item, index) => {
                const loopScope = { [itemName]: item };
                const keyValue = resolveTemplates(node.props?.key, { ...scope, ...loopScope });
                return (
                    <ScopeProvider key={String(keyValue ?? index)} value={loopScope}>
                        {renderChildren(node.children)}
                    </ScopeProvider>
                );
            })}
        </>
    );
}

function IfNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const condition = String(node.props?.condition ?? '');

    if (!evaluateExpression(condition, scope)) {
        return null;
    }

    return <>{renderChildren(node.children)}</>;
}

function InputNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const registry = React.useContext(StateRegistryContext);
    const nearestStateId = [...Object.keys(scope)].reverse().find((key) => isPlainObject(scope[key]));
    const bindPath =
        typeof node.props?.bind === 'string'
            ? node.props.bind
            : nearestStateId && node.props?.name
              ? `${nearestStateId}.${node.props.name}`
              : undefined;
    const boundValue = bindPath ? getByPath(scope, bindPath) : resolveTemplates(node.props?.value, scope);
    const [value, setValue] = useState(boundValue == null ? '' : String(boundValue));
    const placeholder = resolveTemplates(node.props?.placeholder, scope);
    const type = String(resolveTemplates(node.props?.type, scope) ?? 'text');

    useEffect(() => {
        setValue(boundValue == null ? '' : String(boundValue));
    }, [boundValue]);

    return (
        <UIInput
            type={type}
            value={value}
            placeholder={typeof placeholder === 'string' ? placeholder : undefined}
            onChange={(event) => {
                const nextValue = event.currentTarget.value;
                setValue(nextValue);
                if (bindPath) {
                    registry.updatePath(bindPath, nextValue);
                }
            }}
        />
    );
}

function ActionButtonNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const { appId } = useParams();
    const queryClient = useQueryClient();
    const dialogRegistry = React.useContext(DialogRegistryContext);
    const action = resolveTemplates(node.props?.action, scope);
    const method = String(resolveTemplates(node.props?.method, scope) ?? 'POST');
    const variant = resolveTemplates(node.props?.variant, scope);
    const size = resolveTemplates(node.props?.size, scope);
    const payload = parsePayload(node.props?.payload, scope);
    const invalidate = resolveTemplates(node.props?.invalidate, scope);

    const handleClick = async () => {
        if (typeof action === 'string') {
            const parts = action.split(':');
            if (parts.length >= 3 && parts[1] === 'open') {
                dialogRegistry.openDialog(parts[2], payload);
                return;
            }

            if (parts.length >= 3 && parts[1] === 'close') {
                dialogRegistry.closeDialog(parts[2]);
                return;
            }

            if (action.startsWith('/')) {
                const path = appId ? `/apps/${appId}${action}` : action;
                await apiFetch(path, {
                    method,
                    body: payload,
                });
            }
        }

        const targets =
            typeof invalidate === 'string' ? invalidate.split(',') : Array.isArray(invalidate) ? invalidate : [];
        for (const target of targets.map((item) => String(item).trim()).filter(Boolean)) {
            await queryClient.invalidateQueries({ queryKey: ['longlink-query', target] });
        }
    };

    return (
        <UIButton
            variant={typeof variant === 'string' ? (variant as never) : 'default'}
            size={typeof size === 'string' ? (size as never) : undefined}
            onClick={() => {
                void handleClick();
            }}
            className="cursor-pointer"
        >
            {renderChildren(node.children)}
        </UIButton>
    );
}

function RuntimeDialogNode({ node }: { node: ComponentNode }) {
    const dialogId = String(node.props?.id ?? '');
    const registry = React.useContext(DialogRegistryContext);
    const [open, setOpen] = useState(false);
    const [payload, setPayload] = useState<unknown>(undefined);

    useEffect(() => {
        if (!dialogId) {
            return;
        }

        return registry.register(dialogId, {
            setOpen,
            setPayload,
        });
    }, [dialogId, registry]);

    return (
        <ScopeProvider value={{ dialog: { id: dialogId, payload, open } }}>
            <Dialog open={open} onOpenChange={setOpen}>
                {renderChildren(node.children)}
            </Dialog>
        </ScopeProvider>
    );
}

function RuntimeDialogTriggerNode({ node }: { node: ComponentNode }) {
    const childNodes = asArray(node.children);
    const renderedChildren = renderChildren(childNodes);

    if (
        childNodes.length === 1 &&
        isComponentNode(childNodes[0]) &&
        normalizeType(childNodes[0].type) === 'button' &&
        isValidElement(renderedChildren)
    ) {
        return <DialogTrigger render={cloneElement(renderedChildren)} />;
    }

    return <DialogTrigger render={<UIButton variant="outline" />}>{renderedChildren}</DialogTrigger>;
}

function RuntimeDialogContentNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const title = resolveTemplates(node.props?.title, scope);

    return (
        <DialogContent className="sm:max-w-3xl">
            {typeof title === 'string' && title.trim() ? (
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
            ) : null}
            <div className="space-y-4">{renderChildren(node.children)}</div>
        </DialogContent>
    );
}

function SimpleTabsNode({ node }: { node: ComponentNode }) {
    const scope = useScope();
    const defaultValue = resolveTemplates(node.props?.defaultValue, scope);

    return (
        <Tabs defaultValue={typeof defaultValue === 'string' ? defaultValue : undefined}>
            {renderChildren(node.children)}
        </Tabs>
    );
}

function renderChildren(children: JsonNode | JsonNode[] | undefined): ReactNode {
    return asArray(children).map((child, index) => (
        <Fragment key={keyForNode(child, index)}>
            <NodeRenderer node={child} />
        </Fragment>
    ));
}

function NodeRenderer({ node }: { node: JsonNode }) {
    const scope = useScope();

    if (Array.isArray(node)) {
        return <>{renderChildren(node)}</>;
    }

    if (isPrimitiveNode(node)) {
        const resolved = resolveTemplates(node, scope);
        return <>{stringifyValue(resolved)}</>;
    }

    const type = normalizeType(node.type);

    if (type === 'page') {
        return <PageNode node={node} />;
    }

    if (type === 'state') {
        return <StateNode node={node} />;
    }

    if (type === 'query') {
        return <QueryNode node={node} />;
    }

    if (type === 'foreach') {
        return <ForEachNode node={node} />;
    }

    if (type === 'if') {
        return <IfNode node={node} />;
    }

    if (type === 'stack') {
        return <StackNode node={node} />;
    }

    if (type === 'text') {
        return <TextNode node={node} />;
    }

    if (type === 'card') {
        return <CardNode node={node} />;
    }

    if (type === 'columns') {
        const widths = node.props?.widths;
        if (Array.isArray(widths)) {
            return <LegacyRender node={node} />;
        }
        return <ColumnsNode node={node} />;
    }

    if (type === 'column') {
        if (node.props?.width != null) {
            return <LegacyRender node={node} />;
        }
        return <ColumnNode node={node} />;
    }

    if (type === 'field') {
        return <FieldNode node={node} />;
    }

    if (type === 'input') {
        if (node.props?.bind != null || node.props?.name != null) {
            return <InputNode node={node} />;
        }
        return <LegacyRender node={node} />;
    }

    if (type === 'button') {
        if (node.props?.action != null) {
            return <ActionButtonNode node={node} />;
        }
        return <LegacyRender node={node} />;
    }

    if (type === 'dialog') {
        return <RuntimeDialogNode node={node} />;
    }

    if (type === 'dialogtrigger') {
        return <RuntimeDialogTriggerNode node={node} />;
    }

    if (type === 'dialogcontent') {
        return <RuntimeDialogContentNode node={node} />;
    }

    if (type === 'tabs') {
        if (node.props?.tabs != null) {
            return <LegacyRender node={node} />;
        }
        return <SimpleTabsNode node={node} />;
    }

    if (type === 'tabslist') {
        return <TabsList>{renderChildren(node.children)}</TabsList>;
    }

    if (type === 'tabstrigger') {
        const value = String(resolveTemplates(node.props?.value, scope) ?? '');
        return <TabsTrigger value={value}>{renderChildren(node.children)}</TabsTrigger>;
    }

    if (type === 'tabscontent') {
        const value = String(resolveTemplates(node.props?.value, scope) ?? '');
        return <TabsContent value={value}>{renderChildren(node.children)}</TabsContent>;
    }

    if (type === 'table' && node.props?.data == null && node.props?.endpoint == null && node.props?.schema == null) {
        return <Table>{renderChildren(node.children)}</Table>;
    }

    if (type === 'tableheader') {
        return <TableHeader>{renderChildren(node.children)}</TableHeader>;
    }

    if (type === 'tablebody') {
        return <TableBody>{renderChildren(node.children)}</TableBody>;
    }

    if (type === 'tablerow') {
        return <TableRow>{renderChildren(node.children)}</TableRow>;
    }

    if (type === 'tablehead') {
        return <TableHead>{renderChildren(node.children)}</TableHead>;
    }

    if (type === 'tablecell') {
        return <TableCell>{renderChildren(node.children)}</TableCell>;
    }

    if (LEGACY_TYPES.has(type)) {
        return <LegacyRender node={node} />;
    }

    console.warn(`Unknown LongLink component type: ${node.type}`);
    return null;
}

function RuntimeProviders({ children }: { children?: ReactNode }) {
    const stateRegistryRef = useRef(new Map<string, StateRegistration>());
    const dialogRegistryRef = useRef(new Map<string, DialogRegistration>());

    const stateValue = useMemo(
        () => ({
            register: (id: string, registration: StateRegistration) => {
                stateRegistryRef.current.set(id, registration);
                return () => {
                    stateRegistryRef.current.delete(id);
                };
            },
            updatePath: (path: string, value: unknown) => {
                const [stateId, ...segments] = path.split('.');
                const registration = stateRegistryRef.current.get(stateId);

                if (!registration) {
                    return;
                }

                registration.setValue((current: unknown) => setByPath(current, segments, value));
            },
        }),
        []
    );

    const dialogValue = useMemo(
        () => ({
            register: (id: string, registration: DialogRegistration) => {
                dialogRegistryRef.current.set(id, registration);
                return () => {
                    dialogRegistryRef.current.delete(id);
                };
            },
            openDialog: (id: string, payload?: unknown) => {
                const registration = dialogRegistryRef.current.get(id);
                if (!registration) {
                    return;
                }
                registration.setPayload(payload);
                registration.setOpen(true);
            },
            closeDialog: (id: string) => {
                const registration = dialogRegistryRef.current.get(id);
                if (!registration) {
                    return;
                }
                registration.setOpen(false);
                registration.setPayload(undefined);
            },
        }),
        []
    );

    return (
        <StateRegistryContext.Provider value={stateValue}>
            <DialogRegistryContext.Provider value={dialogValue}>
                <ScopeContext.Provider value={{}}>{children}</ScopeContext.Provider>
            </DialogRegistryContext.Provider>
        </StateRegistryContext.Provider>
    );
}

export type { RenderNodeSchema };

type RenderProps = {
    node: unknown;
};

export function renderLonglinkNode(node: unknown) {
    const roots = normalizeRenderRoots(node);

    return (
        <RuntimeProviders>
            {roots.map((root, index) => (
                <NodeRenderer key={keyForNode(root, index)} node={root} />
            ))}
        </RuntimeProviders>
    );
}

export function Render({ node }: RenderProps) {
    return renderLonglinkNode(node);
}

export default Render;
