import type { FieldProps } from './types';

/** Makes the label and description one native hit target without combining their accessible text. */
export function FieldLabel({
    controlId,
    label,
    description,
    required,
}: Pick<FieldProps, 'label' | 'description' | 'required'> & { controlId: string }) {
    return (
        <label htmlFor={controlId} className="view-text-field-heading">
            <span id={`${controlId}-label`} className="view-text-field-label">
                {label}
                {required && (
                    <span className="view-text-field-description">
                        <span aria-hidden="true"> · </span>Required
                    </span>
                )}
            </span>
            {description && (
                <span id={`${controlId}-description`} className="view-text-field-description">
                    {description}
                </span>
            )}
        </label>
    );
}
