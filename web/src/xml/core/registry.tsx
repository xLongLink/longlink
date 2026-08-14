import type { ComponentType } from 'react';
import type { Props } from '../types';
import { Card } from '../adapters/Card';
import { Grid } from '../adapters/Grid';
import { Icon } from '../adapters/Icon';
import { Link } from '../adapters/Link';
import { Text } from '../adapters/Text';
import { Badge } from '../adapters/Badge';
import { Stack } from '../adapters/Stack';
import { Action } from '../adapters/Action';
import { Avatar } from '../adapters/Avatar';
import { Button } from '../adapters/Button';
import { Dialog } from '../adapters/Dialog';
import { Slider } from '../adapters/Slider';
import { Switch } from '../adapters/Switch';
import { Divider } from '../adapters/Divider';
import { Heading } from '../adapters/Heading';
import { TextArea } from '../adapters/TextArea';
import { FileInput } from '../adapters/FileInput';
import { TextInput } from '../adapters/TextInput';
import { Tab, TabList } from '../adapters/TabList';
import { FormLayout } from '../adapters/FormLayout';
import { NumberInput } from '../adapters/NumberInput';
import { Table, TableColumn } from '../adapters/Table';
import { CheckboxInput } from '../adapters/CheckboxInput';
import { SideNav, SideNavItem } from '../adapters/SideNav';
import { Selector, SelectorOption } from '../adapters/Selector';
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
    SelectorOption,
    SideNav,
    SideNavItem,
    Slider,
    Stack,
    Switch,
    Tab,
    TabList,
    Table,
    TableColumn,
    Text,
    TextArea,
    TextInput,
};
