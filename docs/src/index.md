# LongLink

LongLink is a platform for building and running applications that manage data, enforce validation rules, and execute structured workflows. It is designed for systems where correctness, consistency, and control over processes are critical.

The architecture is divided into three primary areas:

- [Control Plane](/api/), which manages infrastructure concerns such as authentication, authorization, request routing, data provisioning, and observability.

- [Applications](/sdk/) are developed as full-code services using a Python SDK built on top of established technologies such as FastAPI for the API layer and SQLAlchemy for data access. Each application exposes a well-defined REST interface and operates on its own isolated data store and storage layer.

- [Pages](/xml/) define the user interface using XML, which is interpreted at runtime and interacts directly with application APIs. This removes the need for separate frontend implementations while maintaining a strict separation between presentation and business logic.

## Why

Modern AI development makes generating code fast and accessible. However, without clear guardrails and a well-defined foundation, codebases tend to become fragmented, inconsistent, and difficult to maintain.

LongLink addresses this by building on top of production-proven technologies and introducing both a control plane and a predefined application structure. This creates a consistent structure that applications must adhere to, giving both developers and AI a clear system context and well-defined boundaries, which leads to higher-quality output.

This reduces complexity, enforces best practices by default, and results in applications that are faster to build, easier to maintain, and more reliable over time.
