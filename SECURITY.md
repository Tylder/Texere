# Security Policy

## Supported release surface

Texere is currently developed in this monorepo and published through tagged releases.

Security reports are most useful when they include:

- affected package or path
- impact summary
- reproduction steps or proof of concept
- any version or environment details that matter

## Reporting a vulnerability

Please do **not** open a public GitHub issue for undisclosed security vulnerabilities.

Preferred path:

1. Use GitHub's private vulnerability reporting for this repository if it is enabled.
2. If private vulnerability reporting is not available, contact the maintainer through GitHub before
   disclosing details publicly.

When in doubt, keep the initial report private and share only the minimum information needed to
begin triage.

## What happens next

The maintainers will try to:

- confirm receipt
- assess severity and affected scope
- work on a fix or mitigation
- coordinate disclosure once a safe path exists

## Scope notes

Security reports should focus on real vulnerabilities in the shipped code or release process.

Examples may include:

- unsafe file handling or command execution
- dependency or packaging issues that materially affect users
- data exposure issues in MCP or graph workflows
- release or publish pipeline weaknesses

General bugs, documentation mistakes, and feature requests should go through the normal issue flow.
