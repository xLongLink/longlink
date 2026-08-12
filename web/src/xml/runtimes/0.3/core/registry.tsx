import type { ComponentType } from 'react';
import { Action } from '../adapters/Action';
import { Avatar } from '../adapters/Avatar';
import { Badge } from '../adapters/Badge';
import { Button } from '../adapters/Button';
import { Card } from '../adapters/Card';
import { CheckboxInput } from '../adapters/CheckboxInput';
import { Dialog } from '../adapters/Dialog';
import { Divider } from '../adapters/Divider';
import { FileInput } from '../adapters/FileInput';
import { FormLayout } from '../adapters/FormLayout';
import { Grid } from '../adapters/Grid';
import { Heading } from '../adapters/Heading';
import { Icon } from '../adapters/Icon';
import { Link } from '../adapters/Link';
import { NumberInput } from '../adapters/NumberInput';
import { RadioList, RadioListItem } from '../adapters/RadioList';
import { Selector, SelectorOption } from '../adapters/Selector';
import { SideNav, SideNavItem } from '../adapters/SideNav';
import { Slider } from '../adapters/Slider';
import { Stack } from '../adapters/Stack';
import { Switch } from '../adapters/Switch';
import { Table, TableColumn } from '../adapters/Table';
import { Tab, TabList } from '../adapters/TabList';
import { Text } from '../adapters/Text';
import { TextArea } from '../adapters/TextArea';
import { TextInput } from '../adapters/TextInput';
import type { Props } from '../types';

/** Explicit Astryx 0.3 XML tag-to-adapter registry. */
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
