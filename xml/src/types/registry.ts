import type { ComponentType } from 'react';

export type RegistryComponent<Props = Record<string, unknown>> = ComponentType<Props>;

export type RegistryShape = Record<string, RegistryComponent<any>>;
