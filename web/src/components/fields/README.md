# Field Components (Form Controls)

// - text
// - password
// - textarea
// - number
// - date
// - select
// - radio
// - checkbox
// - checkbox-group
// - switch
// - tags
// - upload

```ts
interface Component {
    type: string; // Field type (text, email, select, etc.)
    name: string; // Key in form data
    required?: boolean; // Whether the field is required
    default?: string; // Default value for the field
}
```

Allows to create a ViaVai `Form` component.

const sample: list[Component] = [{
"type": "string", // Field type (text, email, select, etc.)
"name": "string", // Key in form data
"label": "string", // Display label
"description": "string", // Help text below field
"placeholder": "string", // Placeholder text for input
"required": true, // Whether the field is required
"default": "string", // Default value for the field
"validate": { // Validation rules, those depends on the field type
"pattern": "string", // Regex pattern for validation
"minLength": 0, // Minimum length for text fields
"maxLength": 0, // Maximum length for text fields
},
"error": "string", // Error message to show if validation fails
"depends": [] // Optional array of dependencies for conditional display, not implemented yet
}]
