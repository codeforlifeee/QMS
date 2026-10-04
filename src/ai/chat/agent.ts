import { getProvider } from '../config.js';
import type { ChatTurn, ProposedChange } from './types.js';
import type { StoredQuotation } from '../../data/schema.js';
import { executeSearchTool, SEARCH_TOOL_SCHEMA } from './tools.js';
import type { ChatMessage } from '../provider.js';

/**
 * ReAct chat agent: lets the user ask natural-language questions or ask for
 * modifications to the current quotation. The agent can call `search_catalog` to find
 * products, then either answers directly or returns a JSON block with
 * `proposedChanges` the UI can apply after user confirmation.
 *
 * - history should already include the user's latest turn (UI appends it before send).
 * - Max 4 tool-call iterations to prevent runaway loops.
 */
export async function runReactAgent(
  quotation: StoredQuotation,
  _message: string,
  history: ChatTurn[],
  providerName: string,
): Promise<{ response: string; proposedChanges: ProposedChange[] }> {
  const provider = getProvider(providerName);

  const systemPrompt = buildSystemPrompt(quotation);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
  ];

  const MAX_LOOPS = 4;
  for (let loop = 0; loop < MAX_LOOPS; loop++) {
    const response = await provider.chat(messages, {
      temperature: 0.1,
      tools: [SEARCH_TOOL_SCHEMA],
    });

    if (response.toolCalls && response.toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.toolCalls,
      });

      for (const tc of response.toolCalls) {
        let result: unknown;
        try {
          if (tc.name === 'search_catalog') {
            result = await executeSearchTool(tc.input);
          } else {
            result = { error: `Unknown tool: ${tc.name}` };
          }
        } catch (err: any) {
          result = { error: err.message || String(err) };
        }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: JSON.stringify(result).slice(0, 8000),
        });
      }
      continue;
    }

    // Final response — try to pull a proposedChanges block.
    const finalContent = response.content || '';
    const proposedChanges = extractProposedChanges(finalContent);
    return {
      response: stripProposedChangesBlock(finalContent),
      proposedChanges,
    };
  }

  return {
    response: 'I reached the maximum number of tool calls and could not complete your request.',
    proposedChanges: [],
  };
}

function buildSystemPrompt(quotation: StoredQuotation): string {
  const summary = {
    id: quotation.id,
    title: quotation.title,
    destination: quotation.destination,
    pax: quotation.pax,
    quoteCurrency: quotation.quoteCurrency,
    days: quotation.days.map((d) => ({ id: d.id, index: d.index, title: d.title })),
    lines: quotation.lines.map((l) => ({
      id: l.id,
      dayId: l.dayId,
      type: l.type,
      label: l.label,
      adultRate: l.adultRate,
      costCurrency: l.costCurrency,
    })),
  };

  return `You are a travel quotation assistant for a quotation editor. You help the agent refine an existing quotation.

Capabilities:
- Call the search_catalog tool to look up real catalog pricing before suggesting changes.
- Propose add_line / update_line / remove_line / update_day / set_field changes for the user to apply.
- Never apply changes yourself — always propose them for the user to confirm.
- Prices in the catalog are stored as integer MINOR UNITS (fils) — a costAed of 4000 means AED 40.00. When proposing a line's adultRate convert to a decimal string ("40.00").
- Use ids from the quotation summary below when referring to existing days / lines.

When you want to propose changes, end your reply with a fenced JSON block of this form (nothing else inside the fence):

\`\`\`json
{
  "proposedChanges": [
    { "type": "add_line", "description": "Add Burj Khalifa ticket on Day 2", "after": { "type": "ACTIVITY", "label": "Burj Khalifa At the Top", "adultRate": "189.00", "costCurrency": "AED", "basis": "PER_PERSON", "dayId": "<existing day id>" } }
  ]
}
\`\`\`

If no changes are needed, just answer the user plainly without the JSON block.

Current quotation summary:
${JSON.stringify(summary, null, 2)}`;
}

function extractProposedChanges(content: string): ProposedChange[] {
  const match = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]!);
    if (parsed && Array.isArray(parsed.proposedChanges)) {
      return parsed.proposedChanges as ProposedChange[];
    }
  } catch {
    // ignore malformed JSON blocks — just omit the proposals
  }
  return [];
}

function stripProposedChangesBlock(content: string): string {
  return content.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
}
