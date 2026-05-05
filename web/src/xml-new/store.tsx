import React from 'react';
import type { XmlContext } from './types';

const XmlContextValue = React.createContext<XmlContext | null>(null);

/** Provides the root XML context for a page. */
export function StoreProvider({ children }: { children: React.ReactNode }) {
    const context: XmlContext = { store: {}, scope: {} };

    return <XmlContextValue.Provider value={context}>{children}</XmlContextValue.Provider>;
}

/** Returns the nearest XML evaluation context. */
export function useContext(): XmlContext {
    const ctx = React.useContext(XmlContextValue);
    if (!ctx) {
        throw new Error('useContext must be used inside StoreProvider');
    }
    return ctx;
}

/** Wraps children in a nested XML context layer. */
export function Context({ value, children }: { value: XmlContext; children: React.ReactNode }) {
    return <XmlContextValue.Provider value={value}>{children}</XmlContextValue.Provider>;
}
