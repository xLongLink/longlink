import type { Props } from '../types';
import { Card } from '../adapters/Card';
import { Grid } from '../adapters/Grid';
import { Icon } from '../adapters/Icon';
import { Link } from '../adapters/Link';
import { Text } from '../adapters/Text';
import { Badge } from '../adapters/Badge';
import { Stack } from '../adapters/Stack';
import { Table } from '../adapters/Table';
import type { ComponentType } from 'react';
import { Action } from '../adapters/Action';
import { Avatar } from '../adapters/Avatar';
import { Button } from '../adapters/Button';
import { Dialog } from '../adapters/Dialog';
import { Slider } from '../adapters/Slider';
import { Switch } from '../adapters/Switch';
import { Divider } from '../adapters/Divider';
import { Heading } from '../adapters/Heading';
import { SideNav } from '../adapters/SideNav';
import { TabList } from '../adapters/TabList';
import { Selector } from '../adapters/Selector';
import { TextArea } from '../adapters/TextArea';
import { FileInput } from '../adapters/FileInput';
import { TextInput } from '../adapters/TextInput';
import { FormLayout } from '../adapters/FormLayout';
import { NumberInput } from '../adapters/NumberInput';
import { CheckboxInput } from '../adapters/CheckboxInput';
import { RadioList, RadioListItem } from '../adapters/RadioList';

/** Explicit Astryx XML tag-to-adapter registry. */
export const xmlComponentRegistry: Record<string, ComponentType<Props>> = {
    Action,
    Avatar,
    Badge,
    Button,
    Card,
    CheckboxInput,
    Dialog,
    Divider,
    FileInput,
    FormLayout,
    Grid,
    Heading,
    Icon,
    Link,
    NumberInput,
    RadioList,
    RadioListItem,
    Selector,
    SideNav,
    Slider,
    Stack,
    Switch,
    TabList,
    Table,
    Text,
    TextArea,
    TextInput,
};
