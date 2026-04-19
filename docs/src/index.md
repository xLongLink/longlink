# LongLink

LongLink is a platform for building and running applications that manage and control business processes.

It enables organizations to create full-code, purpose-built applications that encapsulate data, validation logic, and workflows in a structured and reliable way. Rather than focusing on infrastructure concerns, teams can focus directly on how their business operates.

The platform is conceptually divided into two parts: the [control plane](/api/) that manages the system, and [applications](/sdk/) that implement business logic and processes.

## Why

Business operations are often spread across multiple tools, spreadsheets, and loosely connected systems. This fragmentation leads to inconsistent data, duplicated logic, and manual workarounds, reducing reliability and increasing operational risk.

LongLink addresses this by consolidating data, validation, and process logic into dedicated applications. Instead of relying on people to enforce rules and coordinate steps, the system ensures that data is structured, validated, and processed correctly by design.

This allows computers to perform their intended role: managing state, enforcing constraints, and executing workflows deterministically. As a result, processes become more consistent, traceable, and easier to maintain.

By centralizing data flow and business logic, LongLink reduces system complexity and provides a clear, controlled foundation for building and evolving business processes—particularly in environments where data is otherwise fragmented and difficult to manage.


## Principles

* **Application-centric design**
  Each business responsibility is encapsulated in a dedicated application with clear boundaries.

* **Data ownership and locality**
  Data is managed within the application that is responsible for it, avoiding fragmentation and duplication.

* **Validation by design**
  Business rules are enforced systematically, not through manual checks or external coordination.

* **Deterministic workflows**
  Processes execute in a controlled and predictable manner, with explicit state transitions.

* **Separation of concerns**
  Infrastructure and operational complexity are handled by the platform, allowing applications to focus on business logic.

* **Traceability and auditability**
  All actions, data changes, and process steps are recorded and can be inspected.
