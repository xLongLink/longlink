import { For } from './for';
import { Card } from '../adapters/Card';
import { Grid } from '../adapters/Grid';
import { Icon } from '../adapters/Icon';
import { Link } from '../adapters/Link';
import { Menu } from '../adapters/Menu';
import { Badge } from '../adapters/Badge';
import { Stack } from '../adapters/Stack';
import { Table } from '../adapters/Table';
import { Tabs } from '../adapters/TabList';
import { Action } from '../adapters/Action';
import { Avatar } from '../adapters/Avatar';
import { Button } from '../adapters/Button';
import { Dialog } from '../adapters/Dialog';
import { Slider } from '../adapters/Slider';
import { Switch } from '../adapters/Switch';
import { Divider } from '../adapters/Divider';
import { Heading } from '../adapters/Heading';
import { GridSpan } from '../adapters/GridSpan';
import { MoreMenu } from '../adapters/MoreMenu';
import { Selector } from '../adapters/Selector';
import { TextArea } from '../adapters/TextArea';
import { CodeBlock } from '../adapters/CodeBlock';
import { FileInput } from '../adapters/FileInput';
import { RadioList } from '../adapters/RadioList';
import { StackItem } from '../adapters/StackItem';
import { TextInput } from '../adapters/TextInput';
import type { XmlComponentRegistry } from '../types';
import { NumberInput } from '../adapters/NumberInput';
import { ProgressBar } from '../adapters/ProgressBar';
import { StatusBadge } from '../adapters/StatusBadge';
import { Bold, Italic, Text } from '../adapters/Text';
import { CheckboxInput } from '../adapters/CheckboxInput';

/** XML tag-to-adapter registry bundled with Solutions. */
export const sdkXmlComponentRegistry: XmlComponentRegistry = {
    Action,
    Avatar,
    Badge,
    b: Bold,
    Button,
    Card,
    CheckboxInput,
    CodeBlock,
    Dialog,
    Divider,
    FileInput,
    For,
    Grid,
    GridSpan,
    Heading,
    Icon,
    i: Italic,
    Link,
    Menu,
    MoreMenu,
    NumberInput,
    ProgressBar,
    RadioList,
    Selector,
    Slider,
    Stack,
    StackItem,
    StatusBadge,
    Switch,
    Tabs,
    Table,
    TextArea,
    Text,
    TextInput,
};
