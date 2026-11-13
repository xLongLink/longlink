/** @category Layouts */
export { Stack } from '@/components/custom/Stack';

/** @category Layouts @group Stack */
export { StackItem } from '@/components/custom/Stack';

/** @category Layouts */
export { Grid } from '@/components/custom/Grid';

/** @category Layouts @group Grid */
export { GridSpan } from '@/components/custom/Grid';

/** @category Layouts */
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/shadcn/collapsible';

/** Custom initially-open disclosure with persistent content and controlled-close focus recovery. @category Layouts */
export { Disclosure } from '@/components/custom/Disclosure';

/** @category Display */
export { Heading } from '@/components/custom/Heading';

/** @category Display */
export { Text } from '@/components/custom/Text';

/** @category Display */
export { Avatar, AvatarImage, AvatarFallback } from '@/components/shadcn/avatar';

/** Custom generated artwork and owner-specific avatar fallbacks. @category Display */
export { GeneratedAvatar } from '@/components/custom/GeneratedAvatar';

/** @category Display */
export { Image } from '@/components/custom/Image';

/** @category Display */
export { Badge } from '@/components/reui/badge';

/** @category Display */
export { Token } from '@/components/custom/Token';

/** @category Layouts */
export { Card } from '@/components/shadcn/card';

/** @category Layouts @group Card */
export { CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@/components/shadcn/card';

/** Custom surface actions, selection, navigation, and layout. @category Layouts @group Card */
export { InteractiveCard } from '@/components/custom/InteractiveCard';

/** @category Action */
export { Button } from '@/components/shadcn/button';

/** Custom asynchronous actions with duplicate-activation protection and scoped navigation. @category Action */
export { ActionButton } from '@/components/custom/ActionButton';

/** @category Action */
export { ButtonGroup, ButtonGroupText, ButtonGroupSeparator } from '@/components/shadcn/button-group';

/** Custom grouped actions with roving focus and inherited disabled state. @category Action */
export { ActionButtonGroup } from '@/components/custom/ActionButtonGroup';

/** @category Action */
export {
    DropdownMenu,
    DropdownMenuPortal,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
} from '@/components/shadcn/dropdown-menu';

/** Custom data-driven actions with asynchronous recovery and scoped navigation. @category Action */
export { ActionMenu } from '@/components/custom/ActionMenu';

/** @category Action @group Button */
export { IconButton } from '@/components/custom/IconButton';

/** @category Display */
export { Divider } from '@/components/custom/Divider';

/** @category Layouts */
export {
    Dialog,
    DialogTrigger,
    DialogPortal,
    DialogClose,
    DialogOverlay,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription
} from '@/components/shadcn/dialog';

/** Custom modal frame coordinating fullscreen state with the isolated View host. @category Layouts */
export { ViewDialog } from '@/components/custom/ViewDialog';

/** Submits named themed fields and ordinary HTML inputs to a Solution API endpoint. @category Form */
export { Form } from '@/components/custom/Form';

/** @category Form */
export { DateInput } from '@/components/custom/DateInput';

/** @category Form */
export { MultiSelector } from '@/components/custom/MultiSelector';

/** @category Form */
export { TimeInput } from '@/components/custom/TimeInput';

/** Custom form adapter with string callbacks, clear/reset, and Unicode code-point validation. @category Form */
export { TextInput } from '@/components/custom/TextInput';

/** Custom form adapter with string callbacks, reset, and Unicode code-point validation. @category Form */
export { TextArea } from '@/components/custom/TextArea';

/** @category Form */
export { Input } from '@/components/shadcn/input';

/** @category Form */
export { Textarea } from '@/components/shadcn/textarea';

/** @category Form */
export {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    FieldContent,
    FieldTitle
} from '@/components/shadcn/field';

/** @category Form */
export {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupTextarea,
    InputGroupText
} from '@/components/shadcn/input-group';

/** @category Form */
export { NumberInput } from '@/components/custom/NumberInput';

/** Custom labeled form adapter with reset and focusable disabled controls. @category Form */
export { CheckboxInput } from '@/components/custom/CheckboxInput';

/** @category Form */
export { Checkbox } from '@/components/shadcn/checkbox';

/** @category Form */
export { Switch } from '@/components/shadcn/switch';

/** Custom labeled form adapter with reset and focusable disabled controls. @category Form */
export { SwitchField } from '@/components/custom/SwitchField';

/** @category Form */
export { Slider, SliderControl, SliderTrack, SliderRange, SliderThumb } from '@/components/shadcn/slider';

/** Custom labeled form adapter for native Slider composition. @category Form */
export { SliderField } from '@/components/custom/SliderField';

/** @category Form */
export { FileInput } from '@/components/custom/FileInput';

/** Custom form adapter with nullable values, clear, reset, and controlled rejection. @category Form */
export { Selector } from '@/components/custom/Selector';

/** @category Form */
export { Select } from '@/components/shadcn/select';

/** @category Form @group Select */
export {
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue
} from '@/components/shadcn/select';

/** @category Form */
export { Combobox } from '@/components/shadcn/combobox';

/** @category Form @group Combobox */
export {
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxGroup,
    ComboboxLabel,
    ComboboxCollection,
    ComboboxEmpty,
    ComboboxSeparator,
    ComboboxChips,
    ComboboxChip,
    ComboboxChipsInput,
    ComboboxTrigger,
    ComboboxValue,
    useComboboxAnchor
} from '@/components/shadcn/combobox';

/** @category Form */
export { RadioList } from '@/components/custom/RadioList';

/** @category Form @group RadioList */
export { RadioListItem } from '@/components/custom/RadioList';

/** @category Display */
export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
    TableCaption
} from '@/components/shadcn/table';

/** Custom data-driven rows with safe formatting and ReUI rendering. @category Display */
export { DataTable } from '@/components/custom/DataTable';

/** @category Action */
export {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis
} from '@/components/shadcn/pagination';

/** Custom bounded page selection for table and gallery data. @category Action */
export { DataPagination } from '@/components/custom/DataPagination';

/** @category Display @group Table */
export { proportional, pixel } from '@/components/custom/DataTable';

/** @category Display */
export { Timestamp } from '@/components/custom/Timestamp';

/** @category Display */
export { CodeBlock } from '@/components/custom/CodeBlock';

/** @category Display */
export { Progress } from '@/components/shadcn/progress';

/** @category Display @group Progress */
export { ProgressLabel, ProgressValue, ProgressTrack, ProgressIndicator } from '@/components/shadcn/progress';

/** @category Layouts */
export { Stepper } from '@/components/reui/stepper';

/** @category Layouts @group Stepper */
export {
    StepperNav,
    StepperItem,
    StepperTrigger,
    StepperIndicator,
    StepperSeparator,
    StepperTitle,
    StepperDescription,
    StepperPanel,
    StepperContent
} from '@/components/reui/stepper';

/** Custom progress adapter using zero-based indices and default ReUI styling. @category Layouts */
export { ProgressStepper } from '@/components/custom/Wizard';

/** Custom validated wizard with persistent drafts and asynchronous navigation. @category Layouts */
export { Wizard } from '@/components/custom/Wizard';

/** Custom panel definition for ProgressStepper and Wizard. @category Layouts @group Wizard */
export { Step } from '@/components/custom/Wizard';

/** @category Layouts */
export { Tabs } from '@/components/shadcn/tabs';

/** @category Layouts @group Tabs */
export { TabsList, TabsTrigger, TabsContent } from '@/components/shadcn/tabs';

/** @category Display */
export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/shadcn/empty';

/** Custom semantic headings and scoped result announcements. @category Display */
export { EmptyState } from '@/components/custom/EmptyState';

/** @category Action */
export { MoreMenu } from '@/components/custom/MoreMenu';

/** @category Layouts */
export { Menu } from '@/components/custom/Menu';

/** @category Layouts @group Menu */
export { MenuSection, MenuItem, MenuSubSection } from '@/components/custom/Menu';

/** @category Display */
export { Icon } from '@/components/custom/Icon';

/** @category Action */
export { Link } from '@/components/custom/Link';

/** @category Display */
export { Currency } from '@/components/custom/Currency';

/** @category Display */
export { FileViewer } from '@/components/custom/FileViewer';

/** @category Charts */
export {
    AreaChart,
    BarChart,
    LineChart,
    PieChart,
    RadarChart,
    RadialChart,
    SankeyChart
} from '@/components/custom/Chart';

/** @category Others */
export { Maps } from '@/components/custom/Maps';
