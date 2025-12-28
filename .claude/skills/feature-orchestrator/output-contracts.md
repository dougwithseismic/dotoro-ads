# Sub-Agent Output Contracts

This document defines the exact output format each sub-agent must return to the orchestrator. These contracts ensure minimal context transfer while maintaining complete information flow.

## Why Contracts Matter

Each sub-agent operates in its own context window. Without strict contracts:
- Agents return full verbose output (wastes parent context)
- Parent has to parse unstructured text (error-prone)
- Long sessions fail from context bloat

With contracts:
- Agents return ~100-200 tokens max
- Parent parses structured data reliably
- Sessions can run for hours

---

## Contract Format

All agents must end their response with:

```
---OUTPUT---
key: value
key: [list, items]
key: value
---END---
```

The orchestrator extracts only this block. Everything before it is discarded.

---

## todo-doc-generator Contract

**Purpose**: Generate a TODO.md file and return metadata

**Input Prompt Suffix**:
```
CRITICAL - Your response must end with:
---OUTPUT---
path: .claude/features/[slug]-TODO.md
dependencies: [feature1, feature2] or "none"
priority: [1-5]
phases: [count]
complexity: [low/medium/high]
---END---
```

**Expected Output**:
```
---OUTPUT---
path: .claude/features/auth-system-TODO.md
dependencies: none
priority: 1
phases: 3
complexity: medium
---END---
```

**Orchestrator Action**: Store metadata, add to dependency graph

---

## tdd-task-executor Contract

**Purpose**: Implement a feature phase using TDD

**Input Prompt Suffix**:
```
CRITICAL - End your response with:
---OUTPUT---
phase: [phase number]/[total phases]
phase_complete: [true/false]
files_changed: [file1.ts, file2.ts]
files_created: [newfile.ts] or "none"
tests_added: [count]
tests_passing: [true/false]
test_failures: [list of failing test names] or "none"
blockers: [description] or "none"
next_action: [what needs to happen next]
---END---
```

**Expected Output**:
```
---OUTPUT---
phase: 2/3
phase_complete: true
files_changed: [src/auth/service.ts, src/auth/middleware.ts]
files_created: [src/auth/__tests__/service.test.ts]
tests_added: 8
tests_passing: true
test_failures: none
blockers: none
next_action: proceed to phase 3
---END---
```

**Orchestrator Action**:
- If `phase_complete: true` and `tests_passing: true` → proceed to review
- If `blockers` present → log and potentially halt
- Update TODO doc with phase progress

---

## code-reviewer (pr-review-toolkit:code-reviewer) Contract

**Purpose**: Review code quality and adherence to standards

**Input Prompt Suffix**:
```
CRITICAL - End your response with:
---OUTPUT---
approved: [true/false]
issues_total: [count]
critical: [list of critical issues] or "none"
major: [list of major issues] or "none"
minor: [list of minor issues] or "none"
security: [security concerns] or "none"
test_coverage: [adequate/needs-improvement/insufficient]
recommendation: [approve/revise/block]
---END---
```

**Expected Output**:
```
---OUTPUT---
approved: false
issues_total: 3
critical: none
major: [Missing input validation on email field, No rate limiting on login endpoint]
minor: [Consider extracting magic number to constant]
security: Rate limiting should be added before production
test_coverage: adequate
recommendation: revise
---END---
```

**Orchestrator Action**:
- If `approved: true` → proceed to PR review
- If `approved: false` → send issues to tdd-task-executor for fixes
- Track iteration count (max 3)

---

## code-simplifier (pr-review-toolkit:code-simplifier) Contract

**Purpose**: Simplify and clean code while preserving functionality

**Input Prompt Suffix**:
```
CRITICAL - End your response with:
---OUTPUT---
simplified: [true/false]
files_modified: [list of files]
lines_removed: [count]
complexity_reduction: [none/low/medium/high]
changes_summary: [brief description of simplifications]
---END---
```

**Expected Output**:
```
---OUTPUT---
simplified: true
files_modified: [src/auth/service.ts]
lines_removed: 23
complexity_reduction: medium
changes_summary: Extracted duplicate validation logic, removed unused imports
---END---
```

---

## silent-failure-hunter Contract

**Purpose**: Find silent failures and inadequate error handling

**Input Prompt Suffix**:
```
CRITICAL - End your response with:
---OUTPUT---
silent_failures_found: [count]
locations: [file:line descriptions] or "none"
severity: [none/low/medium/high/critical]
recommendations: [brief list]
---END---
```

**Expected Output**:
```
---OUTPUT---
silent_failures_found: 2
locations: [src/api/client.ts:45 - swallowed Promise rejection, src/auth/token.ts:112 - empty catch block]
severity: high
recommendations: [Add error logging to catch blocks, Propagate errors to caller]
---END---
```

---

## pr-review-toolkit:review-pr Contract

**Purpose**: Final merge gate review

**Input Prompt Suffix**:
```
CRITICAL - End your response with:
---OUTPUT---
ready_to_merge: [true/false]
blocking_issues: [list] or "none"
warnings: [list] or "none"
test_status: [all-pass/some-fail/not-run]
files_reviewed: [count]
approval_confidence: [low/medium/high]
final_recommendation: [merge/revise/reject]
---END---
```

**Expected Output**:
```
---OUTPUT---
ready_to_merge: true
blocking_issues: none
warnings: [Consider adding integration test for edge case]
test_status: all-pass
files_reviewed: 7
approval_confidence: high
final_recommendation: merge
---END---
```

**Orchestrator Action**:
- If `ready_to_merge: true` → create commit
- If `ready_to_merge: false` → send blocking_issues to tdd-task-executor
- Update MASTER.md accordingly

---

## type-design-analyzer Contract

**Purpose**: Analyze type design quality

**Input Prompt Suffix**:
```
CRITICAL - End your response with:
---OUTPUT---
types_analyzed: [count]
quality_score: [1-10]
issues: [list of type design issues] or "none"
recommendations: [list] or "none"
---END---
```

---

## Parsing Contracts in Orchestrator

The orchestrator parses output like this (pseudocode):

```python
def parse_agent_output(response: str) -> dict:
    # Find contract block
    start = response.find("---OUTPUT---")
    end = response.find("---END---")

    if start == -1 or end == -1:
        return {"error": "No contract block found"}

    block = response[start + 12:end].strip()

    # Parse key-value pairs
    result = {}
    for line in block.split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            result[key.strip()] = parse_value(value.strip())

    return result

def parse_value(value: str):
    # Handle arrays
    if value.startswith("[") and value.endswith("]"):
        if value == "[]":
            return []
        items = value[1:-1].split(", ")
        return [item.strip() for item in items]

    # Handle booleans
    if value.lower() == "true":
        return True
    if value.lower() == "false":
        return False

    # Handle "none"
    if value.lower() == "none":
        return None

    # Handle numbers
    try:
        return int(value)
    except ValueError:
        return value
```

---

## Contract Violations

If a sub-agent doesn't include the contract block:
1. Log warning with agent type
2. Attempt to extract key information from response
3. If critical info missing → re-run agent with explicit contract reminder
4. Max 2 retries, then flag as blocker

---

## Adding New Contracts

When adding a new sub-agent type:

1. Define the contract in this file
2. List required fields and optional fields
3. Provide example output
4. Document orchestrator actions
5. Test with sample prompts
