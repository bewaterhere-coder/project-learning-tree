# Product Vision

## Problem

Complex technical learning is branching, but mainstream AI learning is conversation-centered. A long chat mixes questions, evidence, unresolved blockers, side topics, and conclusions into one linear history.

## Hypothesis

Node-centered learning can improve continuity and convergence by making each learning question a first-class object with its own context, evidence, Definition of Done, state, and conversation.

## Product thesis

Project Learning Tree is not an AI mind map. It is a learning-state system represented as a tree.

## Core principles

1. Conversation belongs to a Learning Node.
2. Learning Nodes do not belong to a Conversation.
3. Trees are progressively materialized, never eagerly generated.
4. Blocking questions may become child nodes.
5. Non-blocking adjacent questions move to the Frontier.
6. A question closes when its current Definition of Done is met, not when no further questions exist.
7. AI proposes; the domain engine decides state transitions.

## Initial target user

A technical learner studying a non-trivial open-source project and needing to preserve reasoning continuity across multiple branches of inquiry.

## First dogfood target

Use Project Learning Tree to learn a real open-source project end-to-end, initially OpenSpec or a similarly structured repository.

## Success signal

The MVP should make it easier than a single long AI chat to answer:

- What am I learning now?
- Why is this question blocking me?
- What has already been resolved?
- What evidence supports the conclusion?
- What did I deliberately postpone?
- When is this question done?
