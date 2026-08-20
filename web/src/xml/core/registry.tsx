import type { Props } from '../types';
import { Card } from '../adapters/Card';
import { Grid } from '../adapters/Grid';
import { Icon } from '../adapters/Icon';
import { Link } from '../adapters/Link';
import { Menu } from '../adapters/Menu';
import { Badge } from '../adapters/Badge';
import { Stack } from '../adapters/Stack';
import { Table } from '../adapters/Table';
import { Tabs } from '../adapters/TabList';
import type { ComponentType } from 'react';
import { Action } from '../adapters/Action';
import { Avatar } from '../adapters/Avatar';
import { Button } from '../adapters/Button';
import { Dialog } from '../adapters/Dialog';
import { Slider } from '../adapters/Slider';
import { Switch } from '../adapters/Switch';
import { Divider } from '../adapters/Divider';
import { Heading } from '../adapters/Heading';
import { GridSpan } from '../adapters/GridSpan';
import { Selector } from '../adapters/Selector';
import { TextArea } from '../adapters/TextArea';
import { FileInput } from '../adapters/FileInput';
import { StackItem } from '../adapters/StackItem';
import { TextInput } from '../adapters/TextInput';
import { NumberInput } from '../adapters/NumberInput';
import { Bold, Italic, Text } from '../adapters/Text';
import { CheckboxInput } from '../adapters/CheckboxInput';
import { RadioList } from '../adapters/RadioList';

/** Explicit Astryx XML tag-to-adapter registry. */
export const xmlComponentRegistry: Record<string, ComponentType<Props>> = {
    Action,
    Avatar,
    Badge,
    b: Bold,
    Button,
    Card,
    CheckboxInput,
    Dialog,
    Divider,
    FileInput,
    Grid,
    GridSpan,
    Heading,
    Icon,
    i: Italic,
    Link,
    Menu,
    NumberInput,
    RadioList,
    Selector,
    Slider,
    Stack,
    StackItem,
    Switch,
    Tabs,
    Table,
    TextArea,
    Text,
    TextInput,
};
