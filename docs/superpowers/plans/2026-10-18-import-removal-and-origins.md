# Import removal and transaction origins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove sample imports safely, identify transaction origins, and review or permanently delete entries from the deleted folder.

**Architecture:** Reuse the existing ledger, IndexedDB statement archive, confirmation sheets and transaction detail view. Pure helpers determine provenance, removal membership and permanent-delete effects. Optional metadata and ID tombstones preserve old data compatibility and prevent removed records from returning during archive load or backup merges.

**Tech Stack:** Existing React, TypeScript, localStorage and IndexedDB; no new dependencies.

**Spec:** User request in this chat: remove an imported PDF and its posted entries; filter transaction origin; inspect deleted entries without restoring and offer permanent deletion.

## Global Constraints

- No live financial records are removed by this implementation task. All destructive operations remain explicit actions in the app.
- Remove-import previews preserve matched pre-existing transactions and transactions covered by another retained statement. Its own posted entries move to Deleted Transactions, retaining source metadata.
- Permanent deletion requires a separate in-app confirmation and targets deleted records only. Keep minimal ID tombstones and recurring occurrence exclusions; retain audit history and statement evidence with an explanatory ignore decision.
- Never guess manual versus spreadsheet origin for older records without evidence. Keep account/payment source distinct from entry origin.
- Preserve transaction IDs, amounts, existing settings, backups and inactive capture configuration.

## Review Focus

Membership across overlapping imports; provenance surviving edits; permanent deletion not undone by old backups or recurring catch-up; archive reload after removal; deleted details are read-only until explicit restore.

## Tasks

- [x] Add tested provenance/removal/purge helpers, optional metadata and tombstone validation/backup merge.
- [x] Wire creation paths, remove-import preview/confirmation, source filter and transaction detail origin.
- [x] Add deleted-entry inspection and individually confirmed permanent deletion.
- [ ] Run typecheck, build and source/persistence tests; verify isolated browser flows, reload and backup behavior; publish and verify deployment.

## Verification

Typecheck, build, 114 statement checks, capture and alert checks passed. Isolated Edge browser checks covered import removal, source filters, deleted review, permanent deletion cancellation and confirmation, reload, backup export and mobile layout. Publication verification is pending.
