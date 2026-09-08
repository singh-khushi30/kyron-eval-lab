# Kyron Eval Lab

Minimal full-stack evaluation platform for a healthcare voice agent.

## Purpose

Run synthetic healthcare workflows through a simulated agent, capture a trace of messages and tool/state changes, then score whether the **system** actually completed the task — not just whether the conversation sounded finished.

## Current scope (Phase 2)

Domain model, eight synthetic scenarios, fake healthcare tools, a deterministic `v1-naive` agent, and inspectable traces. No dashboard, evaluators, `v2`, auth, database, or LLM yet.

Stack: Next.js App Router, TypeScript, Tailwind CSS, ESLint.

```bash
npm test
npm run simulate
```

## Synthetic data

All patients, providers, pharmacies, medications, and symptoms are fabricated. No real patient or provider information is used.

## Workflows

- `appointment_reschedule` — move an existing visit to a new slot
- `prescription_refill` — refill a medication, optionally at a new pharmacy

## Evaluation thesis

A conversation can sound successful while the underlying task has actually failed.

Ground truth lives in structured scenario and tool state (`expectedOutcome`, `finalState`, tool results). Transcript claims such as "you're all set" are not evidence of completion.

## Simulation Harness

The harness is deterministic and text-based. It does not call a model and does not play audio.

Fake tools stand in for external healthcare systems (scheduling and pharmacy). They return `success`, `failure`, or `timeout`, and they mutate clinic state only after a confirmed success.

Structured tool results and `finalState` are ground truth for whether a transaction completed. Transcript language alone cannot establish actual completion. `v1-naive` is written to demonstrate that gap: it sometimes says the task is done after a timeout or failure.

This harness cannot evaluate real speech issues such as ASR errors, latency, interruptions, prosody, or acoustic conditions.
