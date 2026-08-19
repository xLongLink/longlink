import { ApiError } from '@/lib/api';
import { renderNode } from '../core/node';
import { ACTION_METHODS } from '../constants';
import { isValtioProxy } from '../core/state';
import { DialogCloseContext } from './Dialog';
import { useXmlRuntime } from '../core/context';
import { resolveRequestUrl } from '../core/url';
import { useToast } from '@/lib/hooks/use-toast';
import { createContext, useContext } from 'react';
import { isSafePropertyName, resolveValue } from '../expressions/resolve';
import type { ASTNode, ASTProps, Props, RuntimeServices, Scope } from '../types';
import { isXmlEnum, readXmlProp, requireXmlString, resolveXml, resolveXmlValue } from '../core/props';

type ActionEffect = { kind: 'request' | 'patch'; props: ASTProps };

const ACTION_ALLOWED_PROPS = new Set(['if']);
const REQUEST_ALLOWED_PROPS = new Set(['url', 'method', 'form', 'json', 'closeDialog']);
const PATCH_ALLOWED_PROPS = new Set(['state', 'value', 'invalidate']);

type ActionPlan = {
    button: ASTNode;
    effects: ActionEffect[];
};

export const ActionHandlerContext = createContext<(() => void) | null>(null);

/** Runs ordered request and state effects from its direct child button. */
export function Action({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const closeDialog = useContext(DialogCloseContext);
    const toast = useToast();
    const plan = createActionPlan(props, nodes);

    /** Executes the declared effects and presents unexpected failures. */
    function handleAction(): void {
        void executeAction(plan, ctx, services, closeDialog, toast).catch((error: unknown) => {
            toast({ body: error instanceof Error ? error.message : 'Action failed', type: 'error' });
        });
    }

    return (
        <ActionHandlerContext.Provider value={handleAction}>
            {renderNode([plan.button], ctx)}
        </ActionHandlerContext.Provider>
    );
}

/** Validates the direct Action children and converts them into executable effects. */
function createActionPlan(props: ASTProps, nodes: ASTNode[]): ActionPlan {
    assertAllowedProps(props, ACTION_ALLOWED_PROPS, 'Action');

    const button = nodes.at(-1);
    if (!button || button.name !== 'Button') {
        throw new Error('Action requires one direct Button trigger after its effects');
    }

    const effects: ActionEffect[] = nodes.slice(0, -1).map((node): ActionEffect => {
        if (node.children.length > 0) {
            throw new Error(`${node.name} cannot have children`);
        }

        if (node.name === 'Request') {
            assertAllowedProps(node.params, REQUEST_ALLOWED_PROPS, 'Request');
            return { kind: 'request', props: node.params };
        }

        if (node.name === 'Patch') {
            assertAllowedProps(node.params, PATCH_ALLOWED_PROPS, 'Patch');
            return { kind: 'patch', props: node.params };
        }

        throw new Error(`Action does not support direct ${node.name} children`);
    });

    if (effects.length === 0) {
        throw new Error('Action requires at least one Request or Patch effect');
    }

    return { button, effects };
}

/** Executes one Action plan in document order. */
async function executeAction(
    plan: ActionPlan,
    ctx: Scope,
    services: RuntimeServices,
    closeDialog: (() => void) | null,
    toast: ReturnType<typeof useToast>
): Promise<void> {
    let closeOnSuccess = false;
    let status: number | null = null;

    for (const effect of plan.effects) {
        if (effect.kind === 'request') {
            const result = await executeRequest(effect.props, ctx, services.requestBaseUrl);
            closeOnSuccess ||= result.closeDialog;
            status = result.status;
        } else {
            await executePatch(effect.props, ctx, services);
        }
    }

    if (closeOnSuccess) {
        closeDialog?.();
    }

    if (status !== null) {
        toast({ body: `Request completed with status ${status}` });
    }
}

/** Sends one configured app-relative request. */
async function executeRequest(
    props: ASTProps,
    ctx: Scope,
    requestBaseUrl: string
): Promise<{ closeDialog: boolean; status: number }> {
    const url = requireXmlString(props, 'url', ctx, 'Request');
    const method = requireXmlString(props, 'method', ctx, 'Request').trim().toUpperCase();
    if (!isXmlEnum(method, ACTION_METHODS)) {
        throw new Error(`Unsupported request method ${method}`);
    }

    const formValue = resolveXmlValue(props, 'form', ctx);
    const jsonValue = resolveXmlValue(props, 'json', ctx);
    if (formValue !== undefined && jsonValue !== undefined) {
        throw new Error('Request cannot send both form and json payloads');
    }
    if (method === 'GET' && (formValue !== undefined || jsonValue !== undefined)) {
        throw new Error('GET requests cannot send payloads');
    }

    const init: RequestInit = { method };
    if (formValue !== undefined) {
        init.body = createActionFormData(formValue);
    } else if (jsonValue !== undefined) {
        init.body = JSON.stringify(jsonValue);
        init.headers = { 'Content-Type': 'application/json' };
    }

    const requestUrl = resolveRequestUrl(requestBaseUrl, url);
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    const response = await fetch(requestUrl, { ...init, credentials: 'include', headers });
    if (!response.ok) {
        throw new ApiError(`API request failed (${response.status})`, response.status);
    }

    const closeDialog = resolveXml(props, 'closeDialog', ctx);
    if (closeDialog !== undefined && typeof closeDialog !== 'boolean') {
        throw new Error('Request closeDialog must resolve to a boolean');
    }

    return { closeDialog: closeDialog === true, status: response.status };
}

/** Updates a State value or invalidates one State or Query setup slot. */
async function executePatch(props: ASTProps, ctx: Scope, services: RuntimeServices): Promise<void> {
    const state = requireLiteralId(props, 'state', 'Patch');
    const valueAttribute = readXmlProp(props, 'value');
    const invalidate = resolveXml(props, 'invalidate', ctx);
    if ((valueAttribute != null) === (invalidate === true)) {
        throw new Error('Patch requires exactly one of value or invalidate="true"');
    }
    if (invalidate !== undefined && typeof invalidate !== 'boolean') {
        throw new Error('Patch invalidate must resolve to a boolean');
    }
    if (!(state in services.setups)) {
        throw new Error(`Patch state "${state}" does not reference a declared State or Query`);
    }

    if (invalidate === true) {
        await services.invalidate([state]);
        return;
    }

    const target = resolveValue(ctx, state);
    if (!isValtioProxy(target)) {
        throw new Error(`Patch state "${state}" must reference a declared State`);
    }

    const value = resolveXmlValue(props, 'value', ctx);
    if (!isPlainObject(value)) {
        throw new Error('Patch value must evaluate to an object');
    }

    for (const [key, entry] of Object.entries(value)) {
        if (!isSafePropertyName(key) || !Object.hasOwn(target, key)) {
            throw new Error(`Patch cannot update undeclared State property "${key}"`);
        }

        target[key] = entry;
    }
}

/** Requires a literal XML setup ID without evaluating a runtime expression. */
function requireLiteralId(props: ASTProps, name: string, componentName: string): string {
    const attribute = readXmlProp(props, name);
    if (attribute?.kind !== 'text' || !attribute.value.trim() || !isSafePropertyName(attribute.value.trim())) {
        throw new Error(`${componentName} requires a literal ${name} ID`);
    }

    return attribute.value.trim();
}

/** Returns whether a value can safely be merged into a State proxy. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/** Rejects attributes outside an XML component's public contract. */
function assertAllowedProps(props: ASTProps, allowed: Set<string>, componentName: string): void {
    for (const name of Object.keys(props)) {
        if (!allowed.has(name)) {
            throw new Error(`${componentName} does not support ${name}`);
        }
    }
}

/** Builds multipart form data from an XML request form expression. */
function createActionFormData(value: unknown): FormData {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('form must evaluate to an object');
    }

    const formData = new FormData();
    for (const [key, entry] of Object.entries(value)) {
        appendActionFormValue(formData, key, entry);
    }

    return formData;
}

/** Appends one XML request form value. */
function appendActionFormValue(formData: FormData, key: string, value: unknown): void {
    if (value == null) {
        return;
    }
    if (Array.isArray(value)) {
        for (const entry of value) {
            appendActionFormValue(formData, key, entry);
        }
        return;
    }
    if (typeof Blob !== 'undefined' && value instanceof Blob) {
        formData.append(key, value);
        return;
    }
    if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
        return;
    }

    formData.append(key, String(value));
}
