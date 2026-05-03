# LongLink

LongLink is a platform for building and running applications that manage data, enforce validation rules, and execute structured workflows. It is designed for systems where correctness, consistency, and control over processes are critical.

The architecture is divided into two primary components:

- The control plane, which manages infrastructure concerns such as authentication, authorization, request routing, data provisioning, and observability.
  Application services, which implement domain-specific business logic, data models, and workflows.

- Applications are developed as full-code services using a Python SDK built on top of established technologies such as FastAPI for the API layer and SQLAlchemy for data access. Each application exposes a well-defined REST interface and operates on its own isolated data store and storage layer.

The user interface is defined declaratively using an XML-based format, which is interpreted at runtime and interacts directly with application APIs. This removes the need for separate frontend implementations while maintaining a strict separation between presentation and business logic.
