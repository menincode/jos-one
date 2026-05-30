---
name: grpc-protobuf
description: Build and maintain gRPC services and Protocol Buffers contracts with backward-compatible schema evolution, code generation workflows, and secure RPC design. Use when users mention gRPC, protobuf, .proto, service contracts, stubs, or RPC integration.
---

# gRPC + Protobuf

## What this skill does
- Design `.proto` contracts (messages, enums, services) for stable API evolution.
- Apply compatibility rules for field changes and deprecations.
- Generate and organize server/client stubs for Go, TypeScript, and Python workflows.
- Implement unary and streaming RPC patterns with validation and error mapping.
- Add security basics: auth metadata, TLS/mTLS guidance, and input limits.

## When to use
Use this skill when working with RPC contracts or implementations, especially for:
- Creating or refactoring `.proto` files.
- Mapping REST use cases to gRPC services.
- Troubleshooting stub generation, package naming, or import paths.
- Handling schema versioning and backward compatibility.

## Contract design rules
1. Define clear package namespace and version early:
   - `package ycm.workflows.v1;`
   - `option go_package = "github.com/org/repo/gen/go/ycm/workflows/v1;workflowspb";`
2. Use `snake_case` for fields and reserve removed field numbers/names:
   - `reserved 7;`
   - `reserved "legacy_field";`
3. Never reuse existing field numbers, even after deletion.
4. Prefer additive change strategy:
   - Add optional/new fields.
   - Mark old fields deprecated before removal.
5. Keep message boundaries small and explicit; avoid unbounded nested payloads.

## Compatibility checklist
- Safe: add new fields with unique numbers.
- Safe: add new RPC methods.
- Caution: rename fields (wire-compatible, but may break generated APIs).
- Unsafe: change existing field numbers or wire types.
- Unsafe: remove enum values used in storage or transport.

## RPC implementation workflow
1. Start from domain use case and define service methods in `.proto`.
2. Add request/response messages with explicit validation constraints in server layer.
3. Generate stubs into deterministic output paths.
4. Implement handlers with:
   - input validation,
   - domain service call,
   - typed status errors (`InvalidArgument`, `NotFound`, `PermissionDenied`, `Internal`).
5. Add tests for:
   - happy path,
   - validation failures,
   - permission failures,
   - compatibility-sensitive serialization cases.

## Error mapping guideline
- Validation error -> `InvalidArgument`
- Missing resource -> `NotFound`
- Auth missing/invalid -> `Unauthenticated`
- Auth present but no scope -> `PermissionDenied`
- Conflict/state mismatch -> `FailedPrecondition` or `AlreadyExists`
- Unexpected failure -> `Internal`

## Security checklist
- Enforce authentication for protected RPCs.
- Validate and bound request sizes; reject oversized payloads early.
- Never trust client-sent IDs/scopes without server-side authorization checks.
- Avoid leaking internal stack traces in status messages.
- Keep secrets/cert material in environment or secret managers only.

## Minimal proto template
```proto
syntax = "proto3";

package ycm.workflows.v1;

option go_package = "github.com/org/repo/gen/go/ycm/workflows/v1;workflowspb";

service WorkflowService {
  rpc GetWorkflow(GetWorkflowRequest) returns (GetWorkflowResponse);
}

message GetWorkflowRequest {
  string workflow_id = 1;
}

message GetWorkflowResponse {
  string workflow_id = 1;
  string name = 2;
}
```

## Additional resources
- For project-specific proto commands and paths, create a local `reference.md` beside this file when workflow stabilizes.
