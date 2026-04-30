---
title: OpenAI Agent Markdown Guidance
type: methodology
status: active
last_updated: 2026-04-30
verified_against_openai_docs: true
---

# OpenAI Agent Markdown Guidance

This project structure was informed by official OpenAI documentation checked on 2026-04-30.

## Docs-Backed Points

OpenAI's prompt engineering guidance for GPT-5 coding tasks recommends:

- Defining the agent role and workflow clearly.
- Setting Markdown standards for clean output.
- Using clean semantic Markdown with inline code, code fences, lists, and tables where appropriate.
- Defining file/folder structure for integration work.
- Using planning, persistence, preambles, and TODO/rubric tracking for longer agentic tasks.

Codex configuration docs also state that Codex prefers `AGENTS.md` or `model_instructions_file` for model instructions, and that project-scoped configuration is available when a project is trusted.

## Inference Applied To This Project

The docs do not prescribe a specific knowledge-base folder layout for this kind of strategy/product project. The structure here is an inference from the docs:

- Use a concise root `README.md` for project orientation.
- Use `AGENTS.md` for durable agent instructions.
- Use `knowledge/INDEX.md` as a short master index.
- Split context into focused supporting Markdown files.
- Use YAML frontmatter for durable metadata.
- Keep source provenance and confidence explicit.

## Official Sources Used

- https://developers.openai.com/api/docs/guides/prompt-engineering#coding
- https://developers.openai.com/codex/config-reference#configtoml

