# Claude Code Agents Research

**Research Date**: 2025-11-02
**Topic**: How to use Claude Code agents for BRM cross-platform development
**Status**: Completed

---

## Executive Summary

Claude Code agents provide a powerful multi-agent orchestration system that can significantly improve development efficiency for the BRM cross-platform project. By using specialized agents with separate context windows, we can:

- Reduce main conversation context usage by 50-60%
- Process research-heavy tasks without bloating the main chat
- Run parallel frontend/backend development
- Maintain persistent knowledge across sessions
- Implement quality gates through automated code review

**Key Finding**: Agents can process 15,000-50,000 tokens internally but return only 1,000-2,000 token summaries to the main conversation, keeping context clean and focused.

---

## How Agents Work

### Separate Context Windows
- Each agent operates in its own context window
- Agent context is completely separate from main conversation
- Prevents "context pollution" of the main chat
- Allows agents to do deep research without impacting main thread

### Information Passing
Agents communicate with the main conversation through:

1. **Condensed Summaries** (Primary Method)
   - Agent processes thousands of tokens internally
   - Returns brief summary (1,000-2,000 tokens)
   - Main conversation receives key findings only

2. **Filesystem Communication** (Advanced Pattern)
   - Agent writes detailed findings to files
   - Returns lightweight reference to main conversation
   - Reduces token passing by 50-60%
   - Creates persistent knowledge base

3. **Structured Response Templates**
   - Agents use consistent return formats
   - Clear status indicators (✅/⚠️/❌)
   - Actionable next steps
   - Critical information only

### Agent Types Available

**Built-in Agent Types:**
- **general-purpose** - Complex multi-step tasks, searching
- **Explore** - Fast codebase exploration (quick/medium/thorough)
- **Plan** - Planning and research before execution

**Custom Agents (Created for BRM):**
- **planner** - Feature planning and research
- **frontend-expert** - TypeScript/React/Ant Design
- **backend-expert** - Rust/Tauri
- **code-reviewer** - Quality and security review
- **researcher** - Library/pattern research

---

## Industry Best Practices

### Research-Plan-Implement-Review Workflow

This is the dominant pattern across production implementations:

```
RESEARCH → PLAN → IMPLEMENT → REVIEW → INTEGRATE
```

1. **Research Phase**: Gather information without cluttering main context
2. **Plan Phase**: Create step-by-step implementation checklist
3. **Implement Phase**: Parallel execution by specialized agents
4. **Review Phase**: Quality gates before finalization
5. **Integrate Phase**: Main conversation handles final integration

### Multi-Agent Orchestration Pattern

**Orchestrator + Specialists:**
- Main agent coordinates global planning and delegation
- Specialized subagents handle specific tasks with narrow focus
- Parallel execution when dependencies are low
- Sequential execution when order matters

### Context Management Strategies

**Six Core Strategies:**
1. **Prompt Hygiene** - Succinct prompts, fresh conversations for new topics
2. **Context Compaction** - Use `/compact` to summarize exchanges
3. **Just-In-Time Retrieval** - Pull information dynamically vs loading everything
4. **Multi-Conversation Workflows** - Split topics across separate chats
5. **Tool Optimization** - Grant agents only required tools
6. **Conversation Forking** - Branch conversations without polluting main thread

---

## MCP Tool Integration

### Available MCP Tools

**Context7** - Up-to-date documentation:
```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp --api-key YOUR_KEY
```
- Get latest docs for Tauri, React, TypeScript, Rust
- Research best practices and patterns
- Used by @planner and @researcher agents

**Ant Design Components** - Component exploration:
```bash
claude mcp add-json "Ant-Design-Components" '{"command":"npx","args":["-y","mcp-antd-components"]}'
```
- List all available components
- Get component API documentation
- Fetch usage examples
- Used by @researcher and @frontend-expert agents

**Filesystem** - Direct file operations:
```bash
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /path/to/project
```
- Read/write files beyond @ references
- Used by all implementation agents

### Integration Patterns

**Agent + MCP Workflow:**
1. Agent receives task
2. Uses MCP tools to gather latest information
3. Processes and analyzes findings
4. Returns condensed summary with recommendations

**Example:**
```
User: "What's the best Ant Design component for file upload?"

@researcher:
  1. Uses list-components to see all options
  2. Uses get-component-docs("Upload") for details
  3. Uses get-component-example("Upload", "basic") for usage
  4. Analyzes and compares options
  5. Returns: "Use Upload component with Dragger for drag-drop support"
```

---

## Cross-Platform Development Patterns

### Parallel Platform Testing

For Tauri projects targeting multiple platforms:

```
Main Agent → Delegates to:
├── @planner (identifies platform requirements)
├── @researcher (finds platform-specific APIs)
├── @backend-expert (implements with platform detection)
├── @frontend-expert (ensures cross-platform UI)
└── @code-reviewer (validates compatibility)
```

### Platform-Specific Considerations

**macOS (Current):**
- Primary development platform
- Full testing and validation
- Menu bar integration
- Notarization requirements

**Windows (Future):**
- Path handling (backslash vs forward slash)
- Registry access patterns
- MSI installer requirements
- File system differences

**Linux (Future):**
- Desktop entry files
- AppImage/Deb/RPM packaging
- Wayland vs X11 compatibility
- Distribution-specific testing

### Cross-Platform Agent Workflow

```
1. @planner - Identifies requirements for each platform
2. @researcher - Finds platform-specific APIs and patterns
3. @backend-expert - Implements with platform detection:
   - Uses PathBuf for cross-platform paths
   - Handles platform-specific file operations
   - Documents platform differences
4. @frontend-expert - Ensures UI works across platforms
5. @code-reviewer - Validates:
   - No hardcoded platform assumptions
   - Proper path handling
   - Platform-specific code isolated and documented
```

---

## Code Review Patterns

### Pre-Implementation Review

**Pattern**: Review before coding prevents issues

```
1. @planner creates implementation plan
2. Main conversation reviews plan
3. @code-reviewer evaluates plan for:
   - Security concerns
   - Cross-platform issues
   - Performance implications
   - Maintainability
4. Refine plan based on feedback
5. Proceed with implementation
```

### Post-Implementation Review

**Pattern**: Quality gate before finalizing

```
1. @frontend-expert / @backend-expert implement
2. @code-reviewer checks:
   - TypeScript: Type safety, React patterns, Ant Design usage
   - Rust: Ownership, error handling, Tauri patterns
   - Security: Input validation, path safety, YAML parsing
   - Cross-Platform: Path handling, file operations
3. Returns categorized issues (Critical/Warning/Suggestion)
4. Developer fixes issues
5. Re-review if needed
```

### Review Checklist Template

Agents use comprehensive checklists:

**TypeScript/React:**
- Type safety (no `any` without justification)
- React hooks usage correct
- Ant Design patterns followed
- Context API usage appropriate
- Error handling present
- Frontend-backend parameter names match

**Rust:**
- Ownership patterns correct
- Error handling with `Result<T, E>`
- No `unwrap()` in production
- Efficient iterator usage
- Tauri command patterns correct

**Cross-Platform:**
- Path handling platform-agnostic
- No hardcoded platform assumptions
- File operations use Tauri APIs

**Security:**
- Input validation present
- YAML parsing handles malformed input
- File paths validated (no directory traversal)

---

## Frontend Design Patterns

### Component Selection Workflow

**Pattern**: Research before implementation

```
1. @researcher uses Ant Design MCP:
   - list-components() - See all available
   - get-component-docs(name) - Get detailed info
   - get-component-example(name, example) - See usage

2. Evaluates options:
   - TypeScript support
   - Customization flexibility
   - Desktop app suitability
   - Bundle size impact

3. Returns recommendation with:
   - Component choice
   - Usage example
   - Configuration tips
   - Trade-offs

4. @frontend-expert implements using recommendation
```

### Design System Evaluation

**Pattern**: Compare libraries systematically

**Assessment Criteria:**
- TypeScript support quality
- Bundle size impact (important for desktop apps)
- Customization flexibility
- Documentation completeness
- Cross-platform compatibility (desktop vs web)
- Community support and maintenance
- Tauri-specific considerations

**Comparison Matrix:**
```
| Feature | Ant Design | Material-UI | Chakra UI | shadcn/ui |
|---------|-----------|-------------|-----------|-----------|
| TS Support | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Bundle Size | Medium | Large | Small | Small |
| Desktop Fit | Excellent | Good | Good | Excellent |
| Docs | Excellent | Excellent | Good | Good |
```

---

## Performance & Cost Considerations

### Token Usage Reality

**Subagent Cost:**
- Active multi-agent sessions consume 3-4x more tokens than single-threaded
- Enterprise deployments show positive ROI within 2-3 months
- Optimized orchestration saves 40-60% vs naive parallel execution

**Optimization Strategies:**
1. Grant minimal tools to agents (only what they need)
2. Use filesystem communication (reduces token passing 50-60%)
3. Compact regularly (use `/compact`)
4. Specific descriptions (prevent unnecessary invocations)
5. Model selection:
   - Opus: Complex architecture decisions
   - Sonnet: Standard development tasks
   - Haiku: Simple linting, formatting

### When NOT to Use Agents

**Skip agents for:**
- Simple, direct tasks ("Fix this typo")
- Highly iterative work (continuous context needed)
- Debugging sessions (conversation flow matters)
- Quick questions ("What does this function do?")

**Use agents for:**
- Research-heavy tasks (library comparisons, pattern research)
- Parallel development (frontend + backend simultaneously)
- Cross-cutting verification (security review, code quality)
- Complex planning (multi-step feature implementation)

---

## Real-World Examples

### Example 1: Component Library Migration

**Scenario**: Migrate from Material-UI to Ant Design

```
@researcher:
  - Evaluated 4 UI libraries
  - Analyzed bundle size impact
  - Checked TypeScript support
  - Documented findings → 800 token summary

@planner:
  - Created migration checklist
  - Identified component mapping
  - Planned rollout strategy

@frontend-expert:
  - Migrated components in parallel
  - Updated theme system
  - Verified TypeScript types

@code-reviewer:
  - Verified consistency
  - Checked for missed components
  - Validated accessibility

Result: 3-day migration vs estimated 2-week manual effort
```

### Example 2: Cross-Platform File System Feature

**Scenario**: Implement file browser for import/export

```
@planner:
  Research findings:
  - Tauri's dialog API is cross-platform
  - Path handling needs platform-specific logic
  - Windows uses backslash, Unix forward slash

  Plan:
  - Use tauri::api::dialog for file picker
  - Create path normalization utility
  - Add platform detection
  - Test on all platforms

@backend-expert:
  Implemented:
  - normalize_path() function
  - Platform-specific path handling
  - Error handling for invalid paths

@frontend-expert:
  Implemented:
  - File browser UI component
  - Path display normalization
  - Error handling
  Used: Ant Design Upload + Modal

@code-reviewer:
  Reviewed:
  ✅ Path handling uses Tauri APIs
  ✅ Error handling comprehensive
  ⚠️ Need E2E tests for Windows/Linux
  ✅ TypeScript types correct
```

### Example 3: Security Audit

**Scenario**: Audit application for vulnerabilities

```
@code-reviewer (security focus):
  Scanned for:
  - YAML parsing vulnerabilities
  - File path injection risks
  - Input validation gaps

  Found 12 issues:
  - 3 Critical: Path traversal
  - 5 Medium: Missing validation
  - 4 Low: Informational

@backend-expert:
  Fixed critical issues:
  - Added path canonicalization
  - Validated paths within allowed dirs
  - Added tests for malicious paths

@code-reviewer (second pass):
  ✅ All critical issues resolved
```

---

## Implementation Guide for BRM

### Agent Setup Completed

**Created Structure:**
```
.claude/
├── agents/
│   ├── planner.md
│   ├── frontend-expert.md
│   ├── backend-expert.md
│   ├── code-reviewer.md
│   └── researcher.md
└── mcp.json

memory-bank/
├── NOTES.md
├── research/
│   └── claude-code-agents.md (this file)
├── decisions/
└── architecture/
```

### Next Steps for Configuration

1. **Get Context7 API Key:**
   - Sign up at https://context7.com
   - Get API key
   - Update `.claude/mcp.json` with your key

2. **Test Agent System:**
   - Start new Claude Code session
   - Try explicit invocation: "Use @planner to research [topic]"
   - Observe automatic invocation
   - Verify agents return summaries

3. **Apply to Cross-Platform Work:**
   - Use @planner with `crossplatformChecklist.md`
   - Let agents research platform requirements
   - Implement with @frontend-expert + @backend-expert
   - Review with @code-reviewer

### Recommended Workflow for crossplatformChecklist.md

```
Phase 1: Platform Requirements Research
1. @planner reads crossplatformChecklist.md
2. @researcher investigates each platform requirement
3. Returns: Platform-specific implementation guide

Phase 2: Implementation Planning
1. @planner creates step-by-step plan
2. Identifies parallel vs sequential tasks
3. Returns: Detailed checklist with dependencies

Phase 3: Parallel Implementation
1. @backend-expert handles Rust/Tauri changes
2. @frontend-expert handles TypeScript/React changes
3. Both run in parallel where possible
4. Return: Implementation summaries

Phase 4: Quality Review
1. @code-reviewer validates all changes
2. Checks cross-platform compatibility
3. Identifies issues by severity
4. Returns: Review report with fixes

Phase 5: Integration & Testing
1. Main conversation integrates changes
2. Runs ./universal_build.sh
3. Tests on macOS
4. Documents Windows/Linux testing requirements
```

---

## Key Takeaways

### Pattern Summary

✅ **DO:**
- Use Research → Plan → Implement → Review workflow
- Create specialized agents with clear, narrow responsibilities
- Return condensed summaries (1,000-2,000 tokens)
- Use filesystem communication for detailed findings
- Grant agents minimal required tools
- Write specific, action-oriented agent descriptions
- Leverage MCP tools (Context7, Ant Design Components)
- Document decisions in memory-bank/
- Use parallel agents for independent tasks
- Compact conversations regularly

❌ **DON'T:**
- Create overly broad, general-purpose agents
- Grant all tools to every agent
- Return full internal context to main conversation
- Use agents for simple, direct tasks
- Ignore token consumption
- Skip the planning phase
- Mix unrelated concerns in single agent
- Forget to document research findings

### Success Metrics to Track

- Time to implement features (before vs after agents)
- Code quality metrics (issues found in review)
- Token consumption (optimize over time)
- Context window usage (should stay low)
- Knowledge retention (reference memory-bank/)

---

## References

- [Claude Code Subagents Documentation](https://docs.claude.com/en/docs/claude-code/sub-agents)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Tauri v2 Documentation](https://v2.tauri.app/)
- [Ant Design Documentation](https://ant.design/)

---

**Implementation Status**: ✅ Complete
**Testing Status**: ⏳ Pending
**Documentation**: ✅ Complete

**Next Action**: Test agent workflow with crossplatformChecklist.md
