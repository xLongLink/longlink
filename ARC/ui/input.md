# Input

`Input` is a polymorphic field component used for text and other primitive input kinds.

## Purpose
- Single reusable field model with a `kind` discriminator.
- Works standalone or within containers like forms/tabs/cards.

## Main properties
- `name`, `kind`, `label`, `value`, `placeholder`, `description`
- `required`, `disabled`
- `submit` (optional endpoint for event-driven submission)

## Behavior
- Serializes as `type: input` with normalized props.
- Frontend renders; backend owns validation/business logic.
