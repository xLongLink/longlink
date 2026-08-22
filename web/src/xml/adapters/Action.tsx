import { z } from 'zod';
import { api } from '@/lib/api';
import { renderNode } from '../core/node';
import { ACTION_METHODS } from '../constants';
import { isValtioProxy } from '../core/state';
import { DialogCloseContext } from './Dialog';
import { useXmlRuntime } from '../core/context';
import { useToast } from '@/lib/hooks/use-toast';
import { createContext, useContext } from 'react';
import { resolveControlUrl, resolveRequestUrl } from '../core/url';
import { isSafePropertyName, resolveValue } from '../expressions/resolve';
import type { ASTNode, ASTProps, Props, RuntimeServices, Scope } from '../types';
import { readXmlProp, resolveXmlProps, resolveXmlValue, xmlNonblankStringSchema } from '../core/props';

type ActionStep = { kind: 'patch' | 'request'; props: ASTProps };

const REQUEST_ALLOWED_PROPS = new Set(['url', 'method', 'form', 'json', 'closeDialog']);
const PATCH_ALLOWED_PROPS = new Set(['state', 'value', 'invalidate']);

const requestPropsSchema = z.object({
    url: xmlNonblankStringSchema,
    method: xmlNonblankStringSchema.transform((value) => value.toUpperCase()).pipe(z.enum(ACTION_METHODS)),
    form: z.unknown().optional(),
    json: z.unknown().optional(),
    closeDialog: z.boolean().optional(),
});

const patchPropsSchema = z.object({
    invalidate: z.boolean().optional(),
});

const navigationPropsSchema = z.object({
    to: z.string().optional(),
    href: z.string().optional(),
});

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
    assertAllowedProps(props, new Set(), 'Action');

    const steps: ActionStep[] = [];
    let control: ASTNode | undefined;

    for (const node of nodes) {
        if (node.name === 'Request' || node.name === 'Patch') {
            if (control) {
                throw new Error('Action effects must precede its Button or Link trigger');
            }
            if (node.children.length > 0) {
                throw new Error(`${node.name} cannot have children`);
            }

            assertAllowedProps(
                node.params,
                node.name === 'Request' ? REQUEST_ALLOWED_PROPS : PATCH_ALLOWED_PROPS,
                node.name
            );
            steps.push({ kind: node.name === 'Request' ? 'request' : 'patch', props: node.params });
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

        await executePatch(step.props, ctx, services);
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
    const { to, href } = resolveXmlProps(node.params, ctx, { to: 'scalar', href: 'scalar' }, navigationPropsSchema);
    return resolveControlUrl(
        services.navigationBaseUrl,
        services.requestBaseUrl,
        to ?? '',
        node.name === 'Link' ? (href ?? '') : ''
    );
}

/** Sends one configured app-relative request. */
async function executeRequest(
    props: ASTProps,
    ctx: Scope,
    requestBaseUrl: string
): Promise<{ closeDialog: boolean; status: number }> {
    const {
        url,
        method,
        form: formValue,
        json: jsonValue,
        closeDialog,
    } = resolveXmlProps(
        props,
        ctx,
        { url: 'scalar', method: 'scalar', form: 'raw', json: 'raw', closeDialog: 'scalar' },
        requestPropsSchema
    );
    if (formValue !== undefined && jsonValue !== undefined) {
        throw new Error('Request cannot send both form and json payloads');
    }
    if (method === 'GET' && (formValue !== undefined || jsonValue !== undefined)) {
        throw new Error('GET requests cannot send payloads');
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
    const response = await api(requestUrl, { body, headers, method });

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
    const value = resolveXmlValue(props, 'value', ctx);
    const { invalidate } = resolveXmlProps(props, ctx, { invalidate: 'scalar' }, patchPropsSchema);
    if ((valueAttribute != null) === (invalidate === true)) {
        throw new Error('Patch requires exactly one of value or invalidate="true"');
    }
    if (!(state in services.setups)) {
        throw new Error(`Patch state "${state}" does not reference a declared State or Query`);
    }

    if (invalidate === true) {
        await services.invalidate(state);
        return;
    }

    const target = resolveValue(ctx, state);
    if (!isValtioProxy(target)) {
        throw new Error(`Patch state "${state}" must reference a declared State`);
    }

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
