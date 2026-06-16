# Command Reference

## Scope

This file lists repository commands for development, validation, and maintenance. It is operational guidance, not product behavior and not an agent bootstrap document.

## Commands

- `node bin/easy-mark.mjs serve <content-directory>`: build the virtual site, serve it, and watch the selected content directory.
- `npm run hooks:install`: configure this clone to use the versioned hooks in `hooks/`.
- `npm run commit:validate -- --message "type(scope): description"`: validate a commit message explicitly.
- `npm run task:commit`: stage all completed task changes, create a deterministic validated commit, create the proposed local tag when applicable, and print the tag push command without pushing.
- `npm run validate:agentic-workflow`: validate the deterministic agentic workflow state machine, skills, and agent role wiring.
- `npm run validate:governance`: validate governance structure and references.
- `npm test`: validate governance and run all Node tests.
- `npm run test:coverage`: run the Node suite with built-in coverage reporting.
- `npm run check`: run the complete required verification.
