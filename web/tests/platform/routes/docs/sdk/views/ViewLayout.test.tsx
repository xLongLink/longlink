// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import Card from '@/platform/routes/docs/sdk/views/Card';
import Form from '@/platform/routes/docs/sdk/views/Form';
import Grid from '@/platform/routes/docs/sdk/views/Grid';
import Icon from '@/platform/routes/docs/sdk/views/Icon';
import Link from '@/platform/routes/docs/sdk/views/Link';
import Menu from '@/platform/routes/docs/sdk/views/Menu';
import Tabs from '@/platform/routes/docs/sdk/views/Tabs';
import Text from '@/platform/routes/docs/sdk/views/Text';
import Badge from '@/platform/routes/docs/sdk/views/Badge';
import Hooks from '@/platform/routes/docs/sdk/views/Hooks';
import Image from '@/platform/routes/docs/sdk/views/Image';
import Stack from '@/platform/routes/docs/sdk/views/Stack';
import Table from '@/platform/routes/docs/sdk/views/Table';
import Token from '@/platform/routes/docs/sdk/views/Token';
import Avatar from '@/platform/routes/docs/sdk/views/Avatar';
import Dialog from '@/platform/routes/docs/sdk/views/Dialog';
import Slider from '@/platform/routes/docs/sdk/views/Slider';
import Switch from '@/platform/routes/docs/sdk/views/Switch';
import Buttons from '@/platform/routes/docs/sdk/views/Buttons';
import Divider from '@/platform/routes/docs/sdk/views/Divider';
import Heading from '@/platform/routes/docs/sdk/views/Heading';
import Stepper from '@/platform/routes/docs/sdk/views/Stepper';
import Currency from '@/platform/routes/docs/sdk/views/Currency';
import MoreMenu from '@/platform/routes/docs/sdk/views/MoreMenu';
import Selector from '@/platform/routes/docs/sdk/views/Selector';
import TextArea from '@/platform/routes/docs/sdk/views/TextArea';
import DateInput from '@/platform/routes/docs/sdk/views/DateInput';
import FileInput from '@/platform/routes/docs/sdk/views/FileInput';
import Functions from '@/platform/routes/docs/sdk/views/Functions';
import RadioList from '@/platform/routes/docs/sdk/views/RadioList';
import TextInput from '@/platform/routes/docs/sdk/views/TextInput';
import TimeInput from '@/platform/routes/docs/sdk/views/TimeInput';
import Timestamp from '@/platform/routes/docs/sdk/views/Timestamp';
import EmptyState from '@/platform/routes/docs/sdk/views/EmptyState';
import FileViewer from '@/platform/routes/docs/sdk/views/FileViewer';
import IconButton from '@/platform/routes/docs/sdk/views/IconButton';
import Pagination from '@/platform/routes/docs/sdk/views/Pagination';
import ViewLayout from '@/platform/routes/docs/sdk/views/ViewLayout';
import Collapsible from '@/platform/routes/docs/sdk/views/Collapsible';
import NumberInput from '@/platform/routes/docs/sdk/views/NumberInput';
import ProgressBar from '@/platform/routes/docs/sdk/views/ProgressBar';
import { documentationPage, renderStatic } from '../../../../../render';
import DropdownMenu from '@/platform/routes/docs/sdk/views/DropdownMenu';
import MetadataList from '@/platform/routes/docs/sdk/views/MetadataList';
import CheckboxInput from '@/platform/routes/docs/sdk/views/CheckboxInput';
import MultiSelector from '@/platform/routes/docs/sdk/views/MultiSelector';

// Keep each page's published heading and route independent of the component catalog.
describe.each([
    { Page: Avatar, heading: 'Avatar', path: '/docs/sdk/views/avatar' },
    { Page: Badge, heading: 'Badge', path: '/docs/sdk/views/badge' },
    { Page: Buttons, heading: 'Buttons', path: '/docs/sdk/views/buttons' },
    { Page: Card, heading: 'Card', path: '/docs/sdk/views/card' },
    { Page: CheckboxInput, heading: 'CheckboxInput', path: '/docs/sdk/views/checkbox-input' },
    { Page: Collapsible, heading: 'Collapsible', path: '/docs/sdk/views/collapsible' },
    { Page: Currency, heading: 'Currency', path: '/docs/sdk/views/currency' },
    { Page: DateInput, heading: 'DateInput', path: '/docs/sdk/views/date-input' },
    { Page: Dialog, heading: 'Dialog', path: '/docs/sdk/views/dialog' },
    { Page: Divider, heading: 'Divider', path: '/docs/sdk/views/divider' },
    { Page: DropdownMenu, heading: 'DropdownMenu', path: '/docs/sdk/views/dropdown-menu' },
    { Page: EmptyState, heading: 'EmptyState', path: '/docs/sdk/views/empty-state' },
    { Page: FileInput, heading: 'FileInput', path: '/docs/sdk/views/file-input' },
    { Page: FileViewer, heading: 'FileViewer', path: '/docs/sdk/views/file-viewer' },
    { Page: Form, heading: 'Form', path: '/docs/sdk/views/form' },
    { Page: Functions, heading: 'Functions', path: '/docs/sdk/views/functions' },
    { Page: Grid, heading: 'Grid', path: '/docs/sdk/views/grid' },
    { Page: Heading, heading: 'Heading', path: '/docs/sdk/views/heading' },
    { Page: Hooks, heading: 'Hooks', path: '/docs/sdk/views/hooks' },
    { Page: Icon, heading: 'Icon', path: '/docs/sdk/views/icon' },
    { Page: IconButton, heading: 'IconButton', path: '/docs/sdk/views/icon-button' },
    { Page: Image, heading: 'Image', path: '/docs/sdk/views/image' },
    { Page: Link, heading: 'Link', path: '/docs/sdk/views/link' },
    { Page: Menu, heading: 'Menu', path: '/docs/sdk/views/menu' },
    { Page: MetadataList, heading: 'MetadataList', path: '/docs/sdk/views/metadata-list' },
    { Page: MoreMenu, heading: 'MoreMenu', path: '/docs/sdk/views/more-menu' },
    { Page: MultiSelector, heading: 'MultiSelector', path: '/docs/sdk/views/multi-selector' },
    { Page: NumberInput, heading: 'NumberInput', path: '/docs/sdk/views/number-input' },
    { Page: Pagination, heading: 'Pagination', path: '/docs/sdk/views/pagination' },
    { Page: ProgressBar, heading: 'ProgressBar', path: '/docs/sdk/views/progress-bar' },
    { Page: RadioList, heading: 'RadioList', path: '/docs/sdk/views/radio-list' },
    { Page: Selector, heading: 'Selector', path: '/docs/sdk/views/selector' },
    { Page: Slider, heading: 'Slider', path: '/docs/sdk/views/slider' },
    { Page: Stack, heading: 'Stack', path: '/docs/sdk/views/stack' },
    { Page: Stepper, heading: 'Stepper', path: '/docs/sdk/views/stepper' },
    { Page: Switch, heading: 'Switch', path: '/docs/sdk/views/switch' },
    { Page: Table, heading: 'Table', path: '/docs/sdk/views/table' },
    { Page: Tabs, heading: 'Tabs', path: '/docs/sdk/views/tabs' },
    { Page: Text, heading: 'Text', path: '/docs/sdk/views/text' },
    { Page: TextArea, heading: 'TextArea', path: '/docs/sdk/views/text-area' },
    { Page: TextInput, heading: 'TextInput', path: '/docs/sdk/views/text-input' },
    { Page: TimeInput, heading: 'TimeInput', path: '/docs/sdk/views/time-input' },
    { Page: Timestamp, heading: 'Timestamp', path: '/docs/sdk/views/timestamp' },
    { Page: Token, heading: 'Token', path: '/docs/sdk/views/token' },
])('$heading', (page) => {
    documentationPage(page.Page, page.heading, page.path);
});

it('rejects references absent from the published component catalog', () => {
    // Act / Assert
    expect(() => renderStatic(<ViewLayout name="MissingComponent" introduction="" />)).toThrow(
        'Missing View documentation: MissingComponent'
    );
});
