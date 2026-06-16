#!/usr/bin/env node
// Markdown governance preflight hook: validates the JSON Markdown contract before governed Markdown edits and triggers repair mode on violations.
import { runMarkdownGovernanceHook } from '../../script/markdown-governance-runtime.mjs';

await runMarkdownGovernanceHook({ event: 'PreToolUse' });
