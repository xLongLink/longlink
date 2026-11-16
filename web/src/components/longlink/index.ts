import * as box from './layout/box';
import * as link from './action/link';
import * as card from './layout/card';
import * as grid from './layout/grid';
import * as menu from './layout/menu';
import * as tabs from './layout/tabs';
import * as icon from './display/icon';
import * as text from './display/text';
import * as stack from './layout/stack';
import * as badge from './display/badge';
import * as empty from './display/empty';
import * as table from './display/table';
import * as button from './action/button';
import * as avatar from './display/avatar';
import * as heading from './display/heading';
import * as dropdown from './action/dropdown';
import * as currency from './display/currency';
import * as progress from './display/progress';
import * as fileType from './display/file-type';
import * as timestamp from './display/timestamp';
import * as maps from '@/components/custom/maps';
import * as frame from '@/components/reui/frame';
import * as image from '@/components/custom/image';
import * as token from '@/components/custom/token';
import * as tile from '@/components/reui/icon-tile';
import * as wizard from '@/components/custom/wizard';
import * as time from '@/components/reui/time-picker';
import * as calendar from '@/components/shadcn/calendar';
import * as group from '@/components/shadcn/button-group';
import * as separator from '@/components/shadcn/separator';
import type { TableFeatures } from '@tanstack/react-table';
import type { PublicComponent, PublicProps } from './props';
import * as filters from '@/components/reui/filters/filters';
import * as pagination from '@/components/shadcn/pagination';
import * as fileViewer from '@/components/custom/file-viewer';
import * as code from '@/components/reui/code-block/code-block';
import * as dataGrid from '@/components/reui/data-grid/data-grid';
import * as dataPagination from '@/components/custom/data-pagination';
import * as gridTable from '@/components/reui/data-grid/data-grid-table';
import * as gridScroll from '@/components/reui/data-grid/data-grid-scroll-area';
import * as gridHeader from '@/components/reui/data-grid/data-grid-column-header';
import * as gridPagination from '@/components/reui/data-grid/data-grid-pagination';

export const Box: PublicComponent<typeof box.Box> = box.Box;
export const Stack: PublicComponent<typeof stack.Stack> = stack.Stack;
export const StackItem: PublicComponent<typeof stack.StackItem> = stack.StackItem;
export const Grid: PublicComponent<typeof grid.Grid> = grid.Grid;
export const GridItem: PublicComponent<typeof grid.GridItem> = grid.GridItem;
export const Heading: PublicComponent<typeof heading.Heading> = heading.Heading;
export const Text: PublicComponent<typeof text.Text> = text.Text;
export const Avatar: PublicComponent<typeof avatar.Avatar> = avatar.Avatar;
export const AvatarGroup: PublicComponent<typeof avatar.AvatarGroup> = avatar.AvatarGroup;
export const Image: PublicComponent<typeof image.Image> = image.Image;
export const Badge: PublicComponent<typeof badge.Badge> = badge.Badge;
export const FileType: PublicComponent<typeof fileType.FileType> = fileType.FileType;
export const Token: PublicComponent<typeof token.Token> = token.Token;
export const Card: PublicComponent<typeof card.Card> = card.Card;
export const Button: PublicComponent<typeof button.Button> = button.Button;
export const ButtonGroup: PublicComponent<typeof group.ButtonGroup> = group.ButtonGroup;
export const ButtonGroupText: PublicComponent<typeof group.ButtonGroupText> = group.ButtonGroupText;
export const ButtonGroupSeparator: PublicComponent<typeof group.ButtonGroupSeparator> = group.ButtonGroupSeparator;
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
export const Separator: PublicComponent<typeof separator.Separator> = separator.Separator;
export { Dialog } from './layout/dialog';
export const Calendar: PublicComponent<typeof calendar.Calendar> = calendar.Calendar;
export const TimePicker: PublicComponent<typeof time.TimePicker> = time.TimePicker;
export const TimePickerTrigger: PublicComponent<typeof time.TimePickerTrigger> = time.TimePickerTrigger;
export const TimePickerValue: PublicComponent<typeof time.TimePickerValue> = time.TimePickerValue;
export const TimePickerInput: PublicComponent<typeof time.TimePickerInput> = time.TimePickerInput;
export const TimePickerContent: PublicComponent<typeof time.TimePickerContent> = time.TimePickerContent;
export const TimePickerPanel: PublicComponent<typeof time.TimePickerPanel> = time.TimePickerPanel;
export const TimePickerColumns: PublicComponent<typeof time.TimePickerColumns> = time.TimePickerColumns;
export const TimePickerColumn: PublicComponent<typeof time.TimePickerColumn> = time.TimePickerColumn;
export const TimePickerFooter: PublicComponent<typeof time.TimePickerFooter> = time.TimePickerFooter;
export const TimePickerNow: PublicComponent<typeof time.TimePickerNow> = time.TimePickerNow;
export const TimePickerClear: PublicComponent<typeof time.TimePickerClear> = time.TimePickerClear;
export const TimePickerConfirm: PublicComponent<typeof time.TimePickerConfirm> = time.TimePickerConfirm;
export const Table: PublicComponent<typeof table.Table> = table.Table;
export const TableHeader: PublicComponent<typeof table.TableHeader> = table.TableHeader;
export const TableBody: PublicComponent<typeof table.TableBody> = table.TableBody;
export const TableFooter: PublicComponent<typeof table.TableFooter> = table.TableFooter;
export const TableRow: PublicComponent<typeof table.TableRow> = table.TableRow;
export const TableHead: PublicComponent<typeof table.TableHead> = table.TableHead;
export const TableCell: PublicComponent<typeof table.TableCell> = table.TableCell;
export const TableCaption: PublicComponent<typeof table.TableCaption> = table.TableCaption;
export const Pagination: PublicComponent<typeof pagination.Pagination> = pagination.Pagination;
export const PaginationContent: PublicComponent<typeof pagination.PaginationContent> = pagination.PaginationContent;
export const PaginationItem: PublicComponent<typeof pagination.PaginationItem> = pagination.PaginationItem;
export const PaginationLink: PublicComponent<typeof pagination.PaginationLink> = pagination.PaginationLink;
export const PaginationPrevious: PublicComponent<typeof pagination.PaginationPrevious> = pagination.PaginationPrevious;
export const PaginationNext: PublicComponent<typeof pagination.PaginationNext> = pagination.PaginationNext;
export const PaginationEllipsis: PublicComponent<typeof pagination.PaginationEllipsis> = pagination.PaginationEllipsis;
export const DataPagination: PublicComponent<typeof dataPagination.DataPagination> = dataPagination.DataPagination;
export const Timestamp: PublicComponent<typeof timestamp.Timestamp> = timestamp.Timestamp;
export const CodeBlock: PublicComponent<typeof code.CodeBlock> = code.CodeBlock;
export const CodeBlockContent: PublicComponent<typeof code.CodeBlockContent> = code.CodeBlockContent;
export const CodeBlockCopyButton: PublicComponent<typeof code.CodeBlockCopyButton> = code.CodeBlockCopyButton;
export const CodeBlockDownloadButton: PublicComponent<typeof code.CodeBlockDownloadButton> =
    code.CodeBlockDownloadButton;
export const CodeBlockExpandButton: PublicComponent<typeof code.CodeBlockExpandButton> = code.CodeBlockExpandButton;
export const CodeBlockHeader: PublicComponent<typeof code.CodeBlockHeader> = code.CodeBlockHeader;
export const CodeBlockLanguage: PublicComponent<typeof code.CodeBlockLanguage> = code.CodeBlockLanguage;
export const CodeBlockLineActions: PublicComponent<typeof code.CodeBlockLineActions> = code.CodeBlockLineActions;
export const CodeBlockTitle: PublicComponent<typeof code.CodeBlockTitle> = code.CodeBlockTitle;
export const CodeBlockWrapToggle: PublicComponent<typeof code.CodeBlockWrapToggle> = code.CodeBlockWrapToggle;
export const Progress: PublicComponent<typeof progress.Progress> = progress.Progress;
export const Wizard: PublicComponent<typeof wizard.Wizard> = wizard.Wizard;
export const Step: PublicComponent<typeof wizard.Step> = wizard.Step;
export const Tabs: PublicComponent<typeof tabs.Tabs> = tabs.Tabs;
export const Tab: PublicComponent<typeof tabs.Tab> = tabs.Tab;
export const Empty: PublicComponent<typeof empty.Empty> = empty.Empty;
export const Menu: PublicComponent<typeof menu.Menu> = menu.Menu;
export const MenuSection: PublicComponent<typeof menu.MenuSection> = menu.MenuSection;
export const MenuItem: PublicComponent<typeof menu.MenuItem> = menu.MenuItem;
export const MenuSubSection: PublicComponent<typeof menu.MenuSubSection> = menu.MenuSubSection;
export const Icon: PublicComponent<typeof icon.Icon> = icon.Icon;
export const IconTile: PublicComponent<typeof tile.IconTile> = tile.IconTile;
export const Link: PublicComponent<typeof link.Link> = link.Link;
export const Currency: PublicComponent<typeof currency.Currency> = currency.Currency;
export const FileViewer: PublicComponent<typeof fileViewer.FileViewer> = fileViewer.FileViewer;
export const Maps: PublicComponent<typeof maps.Maps> = maps.Maps;
export const Frame: PublicComponent<typeof frame.Frame> = frame.Frame;
export const FrameHeader: PublicComponent<typeof frame.FrameHeader> = frame.FrameHeader;
export const FrameTitle: PublicComponent<typeof frame.FrameTitle> = frame.FrameTitle;
export const FramePanel: PublicComponent<typeof frame.FramePanel> = frame.FramePanel;
export const FrameFooter: PublicComponent<typeof frame.FrameFooter> = frame.FrameFooter;

export { Controller, FormProvider } from 'react-hook-form';
export { Input } from './form/input';
export { Textarea } from './form/textarea';
export { Checkbox } from './form/checkbox';
export { Switch } from './form/switch';
export { Slider } from './form/slider';
export { Select } from './form/select';
export { Combobox } from './form/combobox';
export { RadioGroup } from './form/radio';
export type { FormOption } from './form/fields';
export { AreaChart } from './charts/area';
export { BarChart } from './charts/bar';
export { LineChart } from './charts/line';
export { PieChart } from './charts/pie';
export { RadarChart } from './charts/radar';
export { RadialBarChart } from './charts/radial-bar';
export { Sankey } from './charts/sankey';
export { ChartLegend } from './charts/legend';
export type { ChartSeries, SankeyNode, SankeyLink } from './charts/types';
export type { ChartConfig } from '@/components/shadcn/chart';
export { MetricCard, MetricGrid, ProviderChart, UsageChart } from '@/components/custom/analytics';
export { CountryChart } from '@/components/custom/country-chart';
export { RevenueFlow } from '@/components/custom/revenue-flow';
export {
    DEFAULT_TIME_PICKER_I18N,
    mergeTimePickerI18n,
    parseTimeValue,
    formatTimeValue,
    parseTimeInput
} from '@/components/reui/time-picker';
export type * from '@/components/reui/time-picker';
export type TimePickerProps = PublicProps<time.TimePickerProps>;
export type TimePickerTriggerProps = PublicProps<time.TimePickerTriggerProps>;
export type TimePickerValueProps = PublicProps<time.TimePickerValueProps>;
export type TimePickerInputProps = PublicProps<time.TimePickerInputProps>;
export type TimePickerContentProps = PublicProps<time.TimePickerContentProps>;
export type TimePickerPanelProps = PublicProps<time.TimePickerPanelProps>;
export type TimePickerColumnsProps = PublicProps<time.TimePickerColumnsProps>;
export type TimePickerColumnProps = PublicProps<time.TimePickerColumnProps>;
export type TimePickerFooterProps = PublicProps<time.TimePickerFooterProps>;
export type TimePickerActionProps = PublicProps<time.TimePickerActionProps>;
export type CodeBlockProps = PublicProps<code.CodeBlockProps>;
export type CodeBlockCopyButtonProps = PublicProps<code.CodeBlockCopyButtonProps>;
export type CodeBlockDownloadButtonProps = PublicProps<code.CodeBlockDownloadButtonProps>;
export type CodeBlockLineActionsProps = PublicProps<code.CodeBlockLineActionsProps>;
export type {
    CodeBlockFoldRegion,
    CodeBlockLine,
    CodeBlockLineSpec,
    CodeBlockThemes
} from '@/components/reui/code-block/code-block';

export const dataGridFeatures: Omit<dataGrid.DataGridFeatures, 'columnMeta'> & {
    columnMeta: PublicProps<dataGrid.DataGridFeatures['columnMeta']>;
} = dataGrid.dataGridFeatures;

export type DataGridFeatures = typeof dataGridFeatures;
export type { DataGridTableInstance } from '@/components/reui/data-grid/data-grid';
export type DataGridProps<Features extends TableFeatures, Data extends object> = PublicProps<
    dataGrid.DataGridProps<Features, Data>
>;
export type DataGridColumnMeta<Data> = PublicProps<dataGrid.DataGridColumnMeta<Data>>;

export const DataGrid: <Features extends TableFeatures, Data extends object>(
    props: DataGridProps<Features, Data>
) => ReturnType<typeof dataGrid.DataGrid> = dataGrid.DataGrid;

export const DataGridContainer: PublicComponent<typeof dataGrid.DataGridContainer> = dataGrid.DataGridContainer;
export { DataGridTable, DataGridTableRowSelect } from '@/components/reui/data-grid/data-grid-table';
export const DataGridTableRowSelectAll: PublicComponent<typeof gridTable.DataGridTableRowSelectAll> =
    gridTable.DataGridTableRowSelectAll;

export const DataGridColumnHeader: <Data extends object, Value>(
    props: PublicProps<Parameters<typeof gridHeader.DataGridColumnHeader<Data, Value>>[0]>
) => ReturnType<typeof gridHeader.DataGridColumnHeader> = gridHeader.DataGridColumnHeader;

export const DataGridPagination: PublicComponent<typeof gridPagination.DataGridPagination> =
    gridPagination.DataGridPagination;
export const DataGridScrollArea: PublicComponent<typeof gridScroll.DataGridScrollArea> = gridScroll.DataGridScrollArea;

export const Filters: <Value = unknown, Option = unknown>(
    props: PublicProps<Parameters<typeof filters.Filters<Value, Option>>[0]>
) => ReturnType<typeof filters.Filters> = filters.Filters;

export { createFilterQuery, flattenFilterConditions } from '@/components/reui/filters/filters-query';
