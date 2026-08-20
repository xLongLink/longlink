import { ApiError } from '@/lib/api';
import { renderNode } from '../core/node';
import { ACTION_METHODS } from '../constants';
import { isValtioProxy } from '../core/state';
import { DialogCloseContext } from './Dialog';
import { useXmlRuntime } from '../core/context';
import { useToast } from '@/lib/hooks/use-toast';
import { createContext, useContext } from 'react';
import { isSafePropertyName, resolveValue } from '../expressions/resolve';
import type { ASTNode, ASTProps, Props, RuntimeServices, Scope } from '../types';
import { resolveAnchorUrl, resolveNavigationUrl, resolveRequestUrl } from '../core/url';
import { isXmlEnum, readXmlProp, requireXmlString, resolveXml, resolveXmlValue } from '../core/props';

type ActionStep = { kind: 'patch' | 'request'; props: ASTProps };

const ACTION_ALLOWED_PROPS = new Set(['if']);
const REQUEST_ALLOWED_PROPS = new Set(['url', 'method', 'form', 'json', 'closeDialog']);
const PATCH_ALLOWED_PROPS = new Set(['state', 'value', 'invalidate']);

type ActionPlan = {
    control: ASTNode;
    steps: ActionStep[];
};

export const ActionHandlerContext = createContext<(() => void) | null>(null);

/** Runs ordered effects from any child Button or Link trigger. */
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
            {renderNode([plan.control], ctx)}
        </ActionHandlerContext.Provider>
    );
}

/** Validates direct Action children and converts them into ordered executable steps. */
function createActionPlan(props: ASTProps, nodes: ASTNode[]): ActionPlan {
    assertAllowedProps(props, ACTION_ALLOWED_PROPS, 'Action');

    const steps: ActionStep[] = [];
    let control: ASTNode | undefined;

    for (const node of nodes) {
        if (node.name === 'Request') {
            if (control) {
                throw new Error('Action effects must precede its Button or Link trigger');
            }
            if (node.children.length > 0) {
                throw new Error('Request cannot have children');
            }

            assertAllowedProps(node.params, REQUEST_ALLOWED_PROPS, 'Request');
            steps.push({ kind: 'request', props: node.params });
            continue;
        }

        if (node.name === 'Patch') {
            if (control) {
                throw new Error('Action effects must precede its Button or Link trigger');
            }
            if (node.children.length > 0) {
                throw new Error('Patch cannot have children');
            }

            assertAllowedProps(node.params, PATCH_ALLOWED_PROPS, 'Patch');
            steps.push({ kind: 'patch', props: node.params });
            continue;
        }

        if (node.name === 'Button' || node.name === 'Link') {
            if (control) {
                throw new Error('Action requires exactly one direct Button or Link trigger');
            }

            control = node;
            continue;
        }

        throw new Error(`Action does not support direct ${node.name} children`);
    }

    if (!control) {
        throw new Error('Action requires exactly one direct Button or Link trigger');
    }

    return { control, steps };
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

    for (const step of plan.steps) {
        if (step.kind === 'request') {
            const result = await executeRequest(step.props, ctx, services.requestBaseUrl);
            closeOnSuccess ||= result.closeDialog;
            status = result.status;
            continue;
        }

        if (step.kind === 'patch') {
            await executePatch(step.props, ctx, services);
            continue;
        }
    }

    const url = resolveActionNavigationUrl(plan.control, ctx, services);
    if (url) {
        services.navigate(url);
        return;
    }

    if (closeOnSuccess) {
        closeDialog?.();
    }

    if (status !== null) {
        toast({ body: `Request completed with status ${status}` });
    }
}

/** Resolves a terminal navigation destination from one Action control. */
function resolveActionNavigationUrl(node: ASTNode, ctx: Scope, services: RuntimeServices): string {
    const to = resolveXml(node.params, 'to', ctx);
    const navigationUrl = resolveNavigationUrl(services.navigationBaseUrl, typeof to === 'string' ? to : '');
    if (navigationUrl) {
        return navigationUrl;
    }

    if (node.name !== 'Link') {
        return '';
    }

    const href = resolveXml(node.params, 'href', ctx);
    return resolveAnchorUrl(services.requestBaseUrl, typeof href === 'string' ? href : '');
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

    const closeDialog = resolveXml(props, 'closeDialog', ctx);
    if (closeDialog !== undefined && typeof closeDialog !== 'boolean') {
        throw new Error('Request closeDialog must resolve to a boolean');
    }

    const headers = new Headers({ Accept: 'application/json' });
    let body: FormData | string | undefined;

    if (formValue !== undefined) {
        body = createActionFormData(formValue);
    } else if (jsonValue !== undefined) {
        body = JSON.stringify(jsonValue);
        headers.set('Content-Type', 'application/json');
    }

    const requestUrl = resolveRequestUrl(requestBaseUrl, url);
    const response = await fetch(requestUrl, { body, credentials: 'include', headers, method });
    if (!response.ok) {
        throw new ApiError(`API request failed (${response.status})`, response.status);
    }

    return { closeDialog: closeDialog === true, status: response.status };
}

/** Updates a State value or invalidates one State or Query setup. */
async function executePatch(props: ASTProps, ctx: Scope, services: RuntimeServices): Promise<void> {
    const stateAttribute = readXmlProp(props, 'state');
    if (stateAttribute?.kind !== 'text') {
        throw new Error('Patch requires a literal state ID');
    }
    const state = stateAttribute.value.trim();
    if (!state || !isSafePropertyName(state)) {
        throw new Error('Patch requires a literal state ID');
    }
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
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Patch value must evaluate to an object');
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        throw new Error('Patch value must evaluate to an object');
    }

    for (const [key, entry] of Object.entries(value)) {
        if (!isSafePropertyName(key) || !Object.hasOwn(target, key)) {
            throw new Error(`Patch cannot update undeclared State property "${key}"`);
        }

        target[key] = entry;
    }
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
