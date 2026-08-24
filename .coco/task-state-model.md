# Task State Model

This file records the project-facing compatibility view of DevForge 1.x stages. DevForge owns the canonical transition rules; this project does not redefine them.

## Stages

```
requirement
plan
implementation
review
acceptance
merge
done
```

## Gates

```yaml
requirement_ready: false
plan_approved: false
acceptance_approved: false
merge_verified: false
```

## Expected Actor

Allowed values:

```
chatgpt
cursor
github
null
```

## Transition Rules

- requirement_ready enables Plan stage.
- plan_approved enables Implementation stage.
- acceptance_approved enables Merge stage.
- merge_verified enables Done stage.

## Constraint

Current stage controls allowed actions. No stage skipping.
