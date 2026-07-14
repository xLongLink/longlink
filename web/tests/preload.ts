import { afterAll } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

const actEnvironmentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
const headersDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Headers');

// Install the DOM globals before Bun loads React test modules.
GlobalRegistrator.register({ url: 'http://localhost/' });

// Keep Bun's case-normalizing Headers implementation for existing request tests.
if (headersDescriptor) Object.defineProperty(globalThis, 'Headers', headersDescriptor);

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// Close Happy DOM and restore globals after the test run.
afterAll(async () => {
    await GlobalRegistrator.unregister();

    if (actEnvironmentDescriptor) {
        Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actEnvironmentDescriptor);
    } else {
        Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
    }
});
