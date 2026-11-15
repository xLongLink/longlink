import * as time from '@/components/reui/time-picker';
import { viewComponent, type ViewProps } from '../props';

export const TimePicker = viewComponent(time.TimePicker);

export const TimePickerTrigger = viewComponent(time.TimePickerTrigger);

export const TimePickerValue = viewComponent(time.TimePickerValue);

export const TimePickerInput = viewComponent(time.TimePickerInput);

export const TimePickerContent = viewComponent(time.TimePickerContent);

export const TimePickerPanel = viewComponent(time.TimePickerPanel);

export const TimePickerColumns = viewComponent(time.TimePickerColumns);

export const TimePickerColumn = viewComponent(time.TimePickerColumn);

export const TimePickerFooter = viewComponent(time.TimePickerFooter);

export const TimePickerNow = viewComponent(time.TimePickerNow);

export const TimePickerClear = viewComponent(time.TimePickerClear);

export const TimePickerConfirm = viewComponent(time.TimePickerConfirm);

export {
    DEFAULT_TIME_PICKER_I18N,
    mergeTimePickerI18n,
    parseTimeValue,
    formatTimeValue,
    parseTimeInput
} from '@/components/reui/time-picker';

export type * from '@/components/reui/time-picker';

export type TimePickerProps = ViewProps<time.TimePickerProps>;

export type TimePickerTriggerProps = ViewProps<time.TimePickerTriggerProps>;

export type TimePickerValueProps = ViewProps<time.TimePickerValueProps>;

export type TimePickerInputProps = ViewProps<time.TimePickerInputProps>;

export type TimePickerContentProps = ViewProps<time.TimePickerContentProps>;

export type TimePickerPanelProps = ViewProps<time.TimePickerPanelProps>;

export type TimePickerColumnsProps = ViewProps<time.TimePickerColumnsProps>;

export type TimePickerColumnProps = ViewProps<time.TimePickerColumnProps>;

export type TimePickerFooterProps = ViewProps<time.TimePickerFooterProps>;

export type TimePickerActionProps = ViewProps<time.TimePickerActionProps>;
