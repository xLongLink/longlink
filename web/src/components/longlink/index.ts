import * as box from './layout/box';
import * as link from './action/link';
import * as card from './layout/card';
import * as grid from './layout/grid';
import * as menu from './layout/menu';
import * as tabs from './layout/tabs';
import * as icon from './display/icon';
import * as text from './display/text';
import * as frame from './layout/frame';
import * as stack from './layout/stack';
import * as badge from './display/badge';
import * as empty from './display/empty';
import * as image from './display/image';
import * as table from './display/table';
import * as button from './action/button';
import * as avatar from './display/avatar';
import * as heading from './display/heading';
import * as dropdown from './action/dropdown';
import * as currency from './display/currency';
import * as progress from './display/progress';
import * as fileType from './display/file-type';
import * as mapcn from '@/components/mapcn/map';
import * as timestamp from './display/timestamp';
import * as fileViewer from './display/file-viewer';
import type { ReactNode, RefAttributes } from 'react';
import * as group from '@/components/shadcn/button-group';
import * as separator from '@/components/shadcn/separator';
import type { PublicComponent, PublicProps } from './props';
import * as filters from '@/components/reui/filters/filters';

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
export const Table: PublicComponent<typeof table.Table> = table.Table;
export const TableHeader: PublicComponent<typeof table.TableHeader> = table.TableHeader;
export const TableBody: PublicComponent<typeof table.TableBody> = table.TableBody;
export const TableFooter: PublicComponent<typeof table.TableFooter> = table.TableFooter;
export const TableRow: PublicComponent<typeof table.TableRow> = table.TableRow;
export const TableHead: PublicComponent<typeof table.TableHead> = table.TableHead;
export const TableCell: PublicComponent<typeof table.TableCell> = table.TableCell;
export const TableCaption: PublicComponent<typeof table.TableCaption> = table.TableCaption;
export { Pagination } from './action/pagination';
export const Timestamp: PublicComponent<typeof timestamp.Timestamp> = timestamp.Timestamp;
export const Progress: PublicComponent<typeof progress.Progress> = progress.Progress;
export const Tabs: PublicComponent<typeof tabs.Tabs> = tabs.Tabs;
export const Tab: PublicComponent<typeof tabs.Tab> = tabs.Tab;
export const Empty: PublicComponent<typeof empty.Empty> = empty.Empty;
export const Menu: PublicComponent<typeof menu.Menu> = menu.Menu;
export const MenuSection: PublicComponent<typeof menu.MenuSection> = menu.MenuSection;
export const MenuItem: PublicComponent<typeof menu.MenuItem> = menu.MenuItem;
export const MenuSubSection: PublicComponent<typeof menu.MenuSubSection> = menu.MenuSubSection;
export const Icon: PublicComponent<typeof icon.Icon> = icon.Icon;
export const Link: PublicComponent<typeof link.Link> = link.Link;
export const Currency: PublicComponent<typeof currency.Currency> = currency.Currency;
export const FileViewer: PublicComponent<typeof fileViewer.FileViewer> = fileViewer.FileViewer;
const ViewMap: (props: PublicProps<mapcn.MapProps & RefAttributes<mapcn.MapRef>>) => ReactNode = mapcn.Map;
export { ViewMap as Map };
export const MapGeoJSON: PublicComponent<typeof mapcn.MapGeoJSON> = mapcn.MapGeoJSON;
export const MapControls: PublicComponent<typeof mapcn.MapControls> = mapcn.MapControls;
export const Frame: PublicComponent<typeof frame.Frame> = frame.Frame;

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
export { StreetMap } from './maps/street';
export { MarkerMap } from './maps/markers';
export { RouteMap } from './maps/routes';
export { ClusterMap } from './maps/clusters';
export { GeoJSONMap } from './maps/geojson';
export { ArcMap } from './maps/arcs';
export type {
    MapCoordinate,
    MapViewport,
    MapMarker,
    MapRoute,
    MapArc,
    MapGeography,
    MapControlsOptions
} from './maps/types';
export type { ChartSeries, SankeyNode, SankeyLink } from './charts/types';
export type { ChartConfig } from '@/components/shadcn/chart';
export { CountryChart } from '@/components/custom/country-chart';

export {
    useTable,
    dataGridFeatures,
    type DataGridFeatures,
    type ColumnDef,
    type CellContext,
    type RowSelectionState,
    type SortingState
} from './hooks/use-table';
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
} from './display/data-grid';

export const Filters: <Value = unknown, Option = unknown>(
    props: PublicProps<Parameters<typeof filters.Filters<Value, Option>>[0]>
) => ReturnType<typeof filters.Filters> = filters.Filters;

export { createFilterQuery, flattenFilterConditions } from '@/components/reui/filters/filters-query';
