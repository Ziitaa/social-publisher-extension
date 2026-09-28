# Company Brain Integration Contract

This document fixes the intended integration boundary for the future Company Brain rollout. It is a design contract only; the current desktop workflow remains local-first.

## Goal

Expose matrix publishing as a Company Brain tool without moving platform login cookies, browser profiles, or account credentials into Company Brain.

## Boundary

- Company Brain / Tool Router sends a structured publishing request.
- The local publishing service remains responsible for account sessions, browser profiles, platform login state, page injection, task execution, and receipts.
- Platform credentials and session data stay on the local Windows machine under the existing isolated session model.
- Company Brain must not receive raw cookies or browser profile files.

## Recommended Company Brain tool surface

1. `publisher.health`
   - Check whether the local publishing service is reachable.
2. `publisher.accounts.list`
   - Return managed account metadata and readiness state only.
3. `publisher.groups.list`
   - Return saved account groups.
4. `publisher.task.create`
   - Submit a structured content task to selected accounts or an account group.
5. `publisher.task.status`
   - Read task queue / dispatch / failure state.
6. `publisher.receipts.list`
   - Read publish receipts and returned platform IDs when available.

## Human confirmation boundary

For the first Company Brain integration:

- Default to `fill` mode.
- Keep final publish confirmation with the employee for platforms where risk is higher or automation is not fully validated.
- Do not allow Company Brain to silently change account login state, remove accounts, or delete session profiles.
- New account connection remains an explicit local user action because QR login / MFA is human-controlled.

## Security requirements

- Route Company Brain calls through the AI Gateway / Tool Router rather than exposing the local service directly to employees.
- Use a narrow allowlist of actions and payload fields.
- Keep audit logs for requester, target accounts, content hash, task ID, timestamps, result, and errors.
- Do not persist secrets in Company Brain knowledge storage.
- Add role checks before account selection and publishing actions.

## Current local service mapping

The current desktop implementation already provides the basis for this boundary through the local Session Manager, including health, accounts, account groups, task queue, launch, and receipt flows.

The Company Brain integration should therefore wrap the existing local service instead of creating a second publishing engine.

## Rollout order

1. Finish local account connection and publish validation.
2. Produce the admin Windows package and pilot it on a clean employee PC.
3. Stabilize task receipts and login-state reporting.
4. Add a Company Brain Tool Router adapter.
5. Pilot with one internal role before broader rollout.
