import { P } from '@xml/html/P';
import { Button } from '@xml/react/Button';
import { Input } from '@xml/react/Input';

import { For } from '@xml/primitives/For';
import { Page } from '@xml/primitives/Page';
import { Text } from '@xml/primitives/Text';
import type { ComponentType } from 'react';

/** XML component type used by the built-in registry. */
export type XmlRegistryComponent<Props = Record<string, unknown>> = ComponentType<Props>;

/* Build the built-in XML component registry once at module load. */
export const registry: Record<string, XmlRegistryComponent<any>> = {
    Page,
    Text,
    For,
    Button,
    Input,
    p: P,
};
