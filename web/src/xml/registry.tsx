import type { ExecutionContext, RegistryShape } from './types';

import { Blockquote } from './html/Blockquote';
import { H1 } from './html/H1';
import { H2 } from './html/H2';
import { H3 } from './html/H3';
import { H4 } from './html/H4';
import { Li } from './html/Li';
import { P } from './html/P';
import { Ul } from './html/Ul';
import { Button } from './react/Button';
import { Checkbox } from './react/Checkbox';
import { Hero } from './react/Hero';
import { Icon } from './react/Icon';
import { Input } from './react/Input';
import { Menu, MenuSection, MenuSubSection } from './react/Menu';
import { Range } from './react/Range';
import { Select } from './react/Select';
import { Separator } from './react/Separator';
import { Slider } from './react/Slider';
import { Switch } from './react/Switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './react/Table';
import { Textarea } from './react/Textarea';

import { For } from './primitives/For';
import { Page } from './primitives/Page';
import { Query } from './primitives/Query';
import { State } from './primitives/State';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './react/Card';
import Columns, { Column } from './react/Columns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './react/Dialog';
import { Grid } from './react/Grid';
import { Stack } from './react/Stack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './react/Tabs';

/** Creates a minimal ExecutionContext with empty state, queries, and scope. */
export function createContext(initial: Partial<ExecutionContext> = {}): ExecutionContext {
    return {
        state: initial.state ?? {},
        queries: initial.queries ?? {},
        scope: initial.scope ?? {},
        baseUrl: initial.baseUrl ?? '',
    };
}

/* Build the built-in XML component registry once at module load. */
const defaultRegistry = {
    Page,
    Query,
    State,
    For,
    Grid,
    Button,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Checkbox,
    Columns,
    Column,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Hero,
    Icon,
    Input,
    Li,
    Menu,
    MenuSection,
    MenuSubSection,
    Select,
    Range,
    Separator,
    Slider,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Textarea,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    h1: H1,
    h2: H2,
    h3: H3,
    h4: H4,
    p: P,
    blockquote: Blockquote,
    ul: Ul,
    li: Li,
} satisfies RegistryShape;

export const registry = defaultRegistry;
