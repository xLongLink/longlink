# Application SDK

Applications in LongLink are **logic-centric components** designed to implement business rules, validation, and process control.

They do not manage infrastructure, persistence, or rendering directly. Instead, each application defines **how data is validated, processed, and enforced**, while the platform handles execution, storage, and delivery.

An application is therefore a **pure Python logic layer** responsible for:

- enforcing business constraints
- validating and transforming data
- orchestrating workflows and decisions

Each application operates in isolation with:

- a dedicated database for structured data
- a dedicated object storage for unstructured data and files

## Application Types

There are three main types of applications:

- **Systems**
  Long-lived applications supporting core organizational functions such as accounting, content management, marketing, or compliance

- **Workspaces**
  Applications scoped to a specific client or external entity, providing isolated environments for managing related data and operations

- **Workflows**
  Applications that execute a defined process with a clear lifecycle, enforcing required steps, validations, and completion criteria

## Getting Started

Install the SDK:

```bash
pip install longlink
```

Initialize a new application:

```bash
longlink init
```

Run the development server:

```bash
longlink dev
```
