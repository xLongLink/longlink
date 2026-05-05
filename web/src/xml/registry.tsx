import type { ExecutionContext } from '@/xml/types';

import { Blockquote } from '@/xml/html/Blockquote';
import { H1 } from '@/xml/html/H1';
import { H2 } from '@/xml/html/H2';
import { H3 } from '@/xml/html/H3';
import { H4 } from '@/xml/html/H4';
import { Li } from '@/xml/html/Li';
import { P } from '@/xml/html/P';
import { Ul } from '@/xml/html/Ul';
import { Button } from '@/xml/react/Button';
import { Checkbox } from '@/xml/react/Checkbox';
import { Hero } from '@/xml/react/Hero';
import { Icon } from '@/xml/react/Icon';
import { Input } from '@/xml/react/Input';
import { Menu, MenuSection, MenuSubSection } from '@/xml/react/Menu';
import { Range } from '@/xml/react/Range';
import { Select } from '@/xml/react/Select';
import { Separator } from '@/xml/react/Separator';
import { Slider } from '@/xml/react/Slider';
import { Switch } from '@/xml/react/Switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/xml/react/Table';
import { Textarea } from '@/xml/react/Textarea';

import { For } from '@/xml/primitives/For';
import { Page } from '@/xml/primitives/Page';
import { Query } from '@/xml/primitives/Query';
import { State } from '@/xml/primitives/State';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/xml/react/Card';
import { Column, Columns } from '@/xml/react/Columns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/xml/react/Dialog';
import { Grid } from '@/xml/react/Grid';
import { Stack } from '@/xml/react/Stack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/xml/react/Tabs';

/** Creates a flat XML execution context for page state and expression values. */
export function createContext(initial: Partial<ExecutionContext> = {}): ExecutionContext {
    const values = { ...initial };

    delete values.baseUrl;

    return values;
}

/* Build the built-in XML component registry once at module load. */
export const registry = {
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
} as const;
