import type { ComponentType, ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { StoreApi } from 'zustand/vanilla';

export type XmlPrimitive = string | number | boolean | null | undefined;

export type XmlNode = XmlPrimitive | XmlElementNode | XmlNode[];

export interface XmlElementNode {
    type: string;
    props?: Record<string, unknown>;
    children?: XmlNode | XmlNode[];
}

export type ComponentRegistry = Record<string, ComponentType<any> | string>;

export interface LocalBinding {
    stateId: string;
    instanceId: string;
}

export interface RuntimeScope {
    values: Record<string, unknown>;
    bindings: Record<string, LocalBinding>;
}

export interface ActionRequest {
    action: string;
    method: string;
    path: string;
    body?: unknown;
    invalidate?: string | string[];
    scope: Record<string, unknown>;
    node: XmlElementNode;
}

export type ActionHandler = (request: ActionRequest) => Promise<unknown> | unknown;

export interface RenderOptions {
    queryClient?: QueryClient;
    fallback?: ReactNode;
    onAction?: ActionHandler;
}

export interface ReactXMLStateData {
    global: Record<string, unknown>;
    queries: Record<string, unknown>;
    localStates: Record<string, Record<string, unknown>>;
}

export interface ReactXMLStateActions {
    setGlobalValue(path: string, value: unknown): void;
    setQueryData(id: string, value: unknown): void;
    initializeLocalState(instanceId: string, initialState: Record<string, unknown>): void;
    removeLocalState(instanceId: string): void;
    setLocalStateValue(instanceId: string, path: string, value: unknown): void;
}

export type ReactXMLState = ReactXMLStateData & ReactXMLStateActions;

export type ReactXMLStore = StoreApi<ReactXMLState>;

export interface TransformContext {
    depth: number;
    parent: XmlElementNode | null;
    index: number;
}

export interface TransformVisitor {
    enter?(node: XmlNode, context: TransformContext): XmlNode | void | Promise<XmlNode | void>;
    exit?(node: XmlNode, context: TransformContext): XmlNode | void | Promise<XmlNode | void>;
}

export interface TraverseOptions {
    nodeTypes?: string[];
}
