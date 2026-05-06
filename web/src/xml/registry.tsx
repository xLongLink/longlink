import { P } from '@/xml/html/P';
import { Button } from '@/xml/react/Button';
import { Icon } from '@/xml/react/Icon';
import { Input } from '@/xml/react/Input';

import { For } from '@/xml/primitives/For';
import { Page } from '@/xml/primitives/Page';
import { Query } from '@/xml/primitives/Query';
import { State } from '@/xml/primitives/State';
import { Text } from '@/xml/primitives/Text';

/* Build the built-in XML component registry once at module load. */
export const registry = {
    Page,
    Query,
    State,
    Text,
    For,
    Button,
    Icon,
    Input,
    p: P,
};
