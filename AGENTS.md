<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Agent Skills & Memory Directory

**1. THE SKILLS (.skills/)**
Before performing ANY task on this project, ALWAYS check the `.skills/` directory at the root.
If a skill file matches the user's intent (e.g. creating UI, database schema, realtime signals), READ that file first and apply its architectural rules. This approach enforces conventions and saves tokens by isolating context.

**2. THE MEMORY (AI_LEARNINGS.md)**
ALWAYS read `AI_LEARNINGS.md` before starting to write code. It contains the specific traps, bugs, and technical quirks of this repository. 
When you finish a task, if you encountered a difficult bug or a specific project quirk, you MUST append a new bullet point to `AI_LEARNINGS.md` so the next agent doesn't repeat your mistake.
