import * as React from 'react';
import * as box from '@/components/longlink/layout/box';
import * as link from '@/components/longlink/action/link';
import * as card from '@/components/longlink/layout/card';
import * as grid from '@/components/longlink/layout/grid';
import * as menu from '@/components/longlink/layout/menu';
import * as tabs from '@/components/longlink/layout/tabs';
import * as icon from '@/components/longlink/display/icon';
import * as logo from '@/components/longlink/display/logo';
import * as text from '@/components/longlink/display/text';
import * as frame from '@/components/longlink/layout/frame';
import * as stack from '@/components/longlink/layout/stack';
import * as badge from '@/components/longlink/display/badge';
import * as empty from '@/components/longlink/display/empty';
import * as image from '@/components/longlink/display/image';
import * as table from '@/components/longlink/display/table';
import * as button from '@/components/longlink/action/button';
import * as avatar from '@/components/longlink/display/avatar';
import * as heading from '@/components/longlink/display/heading';
import * as dropdown from '@/components/longlink/action/dropdown';
import * as currency from '@/components/longlink/display/currency';
import * as progress from '@/components/longlink/display/progress';
import * as fileType from '@/components/longlink/display/file-type';
import * as timestamp from '@/components/longlink/display/timestamp';
import * as fileViewer from '@/components/longlink/display/file-viewer';
import type { PublicComponent, PublicProps } from '@/components/longlink/props';

export const Box: PublicComponent<typeof box.Box> = box.Box;
export const Stack: (props: Omit<PublicProps<Parameters<typeof stack.Stack>[0]>, 'as'>) => React.ReactNode =
    stack.Stack;
export const StackItem: PublicComponent<typeof stack.StackItem> = stack.StackItem;
export const Grid: PublicComponent<typeof grid.Grid> = grid.Grid;
export const GridItem: PublicComponent<typeof grid.GridItem> = grid.GridItem;
export const Heading: PublicComponent<typeof heading.Heading> = heading.Heading;
export const Text: PublicComponent<typeof text.Text> = text.Text;
export const Avatar: PublicComponent<typeof avatar.Avatar> = avatar.Avatar;
export const AvatarGroup: PublicComponent<typeof avatar.AvatarGroup> = avatar.AvatarGroup;
export const Image: PublicComponent<typeof image.Image> = image.Image;
export const Logo: PublicComponent<typeof logo.Logo> = logo.Logo;
export const Badge: PublicComponent<typeof badge.Badge> = badge.Badge;
export const FileType: PublicComponent<typeof fileType.FileType> = fileType.FileType;
export const Card: PublicComponent<typeof card.Card> = card.Card;
export const Button: PublicComponent<typeof button.Button> = button.Button;
export { ButtonGroup, ButtonGroupText, ButtonGroupSeparator } from '@/components/longlink/action/button-group';
export const Dropdown: PublicComponent<typeof dropdown.Dropdown> = dropdown.Dropdown;
export const DropdownPortal: PublicComponent<typeof dropdown.DropdownPortal> = dropdown.DropdownPortal;
export const DropdownTrigger: PublicComponent<typeof dropdown.DropdownTrigger> = dropdown.DropdownTrigger;
export const DropdownContent: PublicComponent<typeof dropdown.DropdownContent> = dropdown.DropdownContent;
export const DropdownGroup: PublicComponent<typeof dropdown.DropdownGroup> = dropdown.DropdownGroup;
export const DropdownLabel: PublicComponent<typeof dropdown.DropdownLabel> = dropdown.DropdownLabel;
export const DropdownItem: PublicComponent<typeof dropdown.DropdownItem> = dropdown.DropdownItem;
export const DropdownCheckboxItem: PublicComponent<typeof dropdown.DropdownCheckboxItem> =
    dropdown.DropdownCheckboxItem;
export const DropdownRadioGroup: PublicComponent<typeof dropdown.DropdownRadioGroup> = dropdown.DropdownRadioGroup;
export const DropdownRadioItem: PublicComponent<typeof dropdown.DropdownRadioItem> = dropdown.DropdownRadioItem;
export const DropdownSeparator: PublicComponent<typeof dropdown.DropdownSeparator> = dropdown.DropdownSeparator;
export const DropdownShortcut: PublicComponent<typeof dropdown.DropdownShortcut> = dropdown.DropdownShortcut;
export const DropdownSub: PublicComponent<typeof dropdown.DropdownSub> = dropdown.DropdownSub;
export const DropdownSubTrigger: PublicComponent<typeof dropdown.DropdownSubTrigger> = dropdown.DropdownSubTrigger;
export const DropdownSubContent: PublicComponent<typeof dropdown.DropdownSubContent> = dropdown.DropdownSubContent;
export { Separator } from '@/components/longlink/layout/separator';
export { Dialog } from '@/components/longlink/layout/dialog';
export const Table: PublicComponent<typeof table.Table> = table.Table;
export const TableHeader: PublicComponent<typeof table.TableHeader> = table.TableHeader;
export const TableBody: PublicComponent<typeof table.TableBody> = table.TableBody;
export const TableFooter: PublicComponent<typeof table.TableFooter> = table.TableFooter;
export const TableRow: PublicComponent<typeof table.TableRow> = table.TableRow;
export const TableHead: PublicComponent<typeof table.TableHead> = table.TableHead;
export const TableCell: PublicComponent<typeof table.TableCell> = table.TableCell;
export const TableCaption: PublicComponent<typeof table.TableCaption> = table.TableCaption;
export { Pagination } from '@/components/longlink/action/pagination';
export const Timestamp: PublicComponent<typeof timestamp.Timestamp> = timestamp.Timestamp;
export const Progress: PublicComponent<typeof progress.Progress> = progress.Progress;
export const Tabs: PublicComponent<typeof tabs.Tabs> = tabs.Tabs;
export const Empty: PublicComponent<typeof empty.Empty> = empty.Empty;
export const Menu: PublicComponent<typeof menu.Menu> = menu.Menu;
export const Icon: PublicComponent<typeof icon.Icon> = icon.Icon;
export const Link: PublicComponent<typeof link.Link> = link.Link;
export const Currency: PublicComponent<typeof currency.Currency> = currency.Currency;
export const FileViewer: PublicComponent<typeof fileViewer.FileViewer> = fileViewer.FileViewer;
export const Frame: PublicComponent<typeof frame.Frame> = frame.Frame;

export const useState = React.useState;
export const useEffect = React.useEffect;
export const useMemo = React.useMemo;
export const useRef = React.useRef;
export { z } from 'zod';
export { useApi } from '@/components/longlink/hooks/use-api';
export { useForm, type FormOptions } from '@/components/longlink/hooks/use-form';
export { useConfirm, type ConfirmOptions } from '@/components/longlink/hooks/use-confirm';
export { Form, Controller } from '@/components/longlink/form/form';
export { Input } from '@/components/longlink/form/input';
export { Textarea } from '@/components/longlink/form/textarea';
export { Checkbox } from '@/components/longlink/form/checkbox';
export { Switch } from '@/components/longlink/form/switch';
export { Slider } from '@/components/longlink/form/slider';
export { Select } from '@/components/longlink/form/select';
export { Combobox } from '@/components/longlink/form/combobox';
export { RadioGroup } from '@/components/longlink/form/radio';
export type { FormOption } from '@/components/longlink/form/fields';
export type {
    MapCoordinate,
    MapViewport,
    MapMarker,
    MapRoute,
    MapArc,
    MapGeography,
    MapControlsOptions
} from '@/components/longlink/maps/types';
export type { ChartSeries, SankeyNode, SankeyLink } from '@/components/longlink/charts/types';

export {
    useTable,
    dataGridFeatures,
    type DataGridFeatures,
    type ColumnDef,
    type CellContext,
    type RowSelectionState,
    type SortingState
} from '@/components/longlink/hooks/use-table';
export {
    DataGrid,
    DataGridContainer,
    DataGridTable,
    DataGridTableRowSelect,
    DataGridTableRowSelectAll,
    DataGridColumnHeader,
    DataGridPagination,
    DataGridScrollArea,
    type DataGridTableInstance,
    type DataGridProps,
    type DataGridColumnMeta
} from '@/components/longlink/display/data-grid';

export { Filters, createFilterQuery, flattenFilterConditions } from '@/components/longlink/display/filters';
