# Multi-account publishing architecture

## Goal

Support many authorized accounts per platform without sharing one browser login state across all accounts.

## Model

```
Platform
  -> Account
     -> Session
        -> Publish Task
```

## Extension responsibilities

- Content editing.
- Account selection.
- Task creation.
- Platform-specific page filling.
- Optional final submit only where explicitly enabled.
- Xiaohongshu remains fill-only.

## Local Session Manager responsibilities

The browser extension alone cannot safely host dozens of independent login states for the same site inside one Chrome profile. A local companion process will therefore own session isolation.

Each managed account gets:

- account id
- platform
- display label
- optional username
- session reference
- login status
- last health check
- publish eligibility

The Session Manager will:

1. Launch or attach to a dedicated browser profile for the selected account.
2. Open the official creator page.
3. Hand the publish task to the Social Publisher extension in that session.
4. Return a receipt/status to the local queue.

## Safety constraints

- Accounts must be owned or authorized by the operator.
- Do not implement anti-detection, fingerprint spoofing, CAPTCHA bypass, or platform-control evasion.
- Do not reuse cookies across accounts.
- Do not auto-submit on Xiaohongshu.
- Publishing rates and content should remain within each platform's policies.

## Implementation stages

### Stage A — done
- Account pool storage model.
- Account pool UI.
- Multiple accounts can be recorded under one platform.

### Stage B — implemented
- Local Session Manager HTTP contract.
- Each managed account binds to an isolated Chrome user-data directory.
- Dedicated Chrome for Testing session browser can load the unpacked extension automatically.
- Session heartbeat and online/offline status.
- Launch/login account session from the account-pool UI.
- Existing local account-pool records migrate into Session Manager on first connection.

### Stage C — implemented v0
- Batch publish queue.
- Select many accounts across one or more platforms.
- Queue tasks are claimed by the matching isolated account session.
- Shared media is deduplicated per batch instead of copied once per account.
- Two-minute task leases prevent one crashed session from permanently consuming a queued task.
- Per-account dispatch/failure receipts.
- Dynamic/image and video batch payloads.
- Xiaohongshu remains forced fill-only.

### Stage D
- Local drafts/history.
- Recruitment and ad-content templates.
- Team permissions if moved beyond a single workstation.
