#!/usr/bin/env node
// Markdown governance postflight hook: checks edited governed Markdown against the JSON Markdown contract, writes a report, and triggers repair mode on violations.
import { runMarkdownGovernanceHook } from '../../script/markdown-governance-runtime.mjs';

await runMarkdownGovernanceHook({ event: 'PostToolUse' });
