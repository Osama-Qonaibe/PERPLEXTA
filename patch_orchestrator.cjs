const fs = require('fs');
let code = fs.readFileSync('server/services/orchestrator.ts', 'utf8');
code = code.replace(
`  const toolBoundary = isChatOnly
    ? \`[TOOL: chat]: No direct code blocks. For code, output specific En/Ar workstation disclosure.\`
    : \`[TOOL: \${toolIdStr}]\`;

  const finalSystemPrompt = \`\${protocol}
[OBJECTIVE]: \${taskDesc || 'Professional precision execution.'}
\${toolBoundary}\${contextSummary}\${userMemoriesStr}
\${refinedSystemPromptSegment}\`.trim();`,
`  const finalSystemPrompt = \`\${protocol}
[OBJECTIVE]: \${taskDesc || 'Professional precision execution.'}
\${contextSummary}\${userMemoriesStr}
\${refinedSystemPromptSegment}\`.trim();`
);
fs.writeFileSync('server/services/orchestrator.ts', code);
