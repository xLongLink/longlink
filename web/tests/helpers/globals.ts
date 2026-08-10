type GlobalPropertyName = 'fetch';

/** Temporarily replaces one test environment global and restores its original descriptor. */
export async function withGlobalValue(
    name: GlobalPropertyName,
    value: unknown,
    callback: () => Promise<void>
): Promise<void> {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);

    Object.defineProperty(globalThis, name, {
        configurable: true,
        value,
    });

    try {
        await callback();
    } finally {
        if (descriptor) {
            Object.defineProperty(globalThis, name, descriptor);
        } else {
            Reflect.deleteProperty(globalThis, name);
        }
    }
}
