import { END, START, StateGraph } from '@langchain/langgraph';
import { State } from './state';
import { model } from './model';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

async function writer(state: typeof State.State) {
    const SYSTEM_PROMPT = `You are a LinkedIn writing assistant for beginner devs (0–2 years).
    Goal: helpful, human, buzzword-free posts.

    Style & format:
    - Conversational, authentic, short lines, whitespace friendly.
    - 160–220 words. Max 2 relevant emojis.
    - Hook in the first 2 lines. Give 1–2 concrete examples. Clear takeaway.
    - Explain any jargon with a quick analogy or simple example.
    - Avoid controversy. Include a simple CTA to follow for more.

    Behavior:
    - If the latest human message contains critique or says “Revise now”, treat it as an explicit order to revise the previous draft. Apply all requested changes.
    - Do NOT ask questions or seek confirmation. Output only the post text (no preamble).
`;

    const response = await model.invoke([new SystemMessage(SYSTEM_PROMPT), ...state.messages]);

    return { messages: [response] };
}

async function critique(state: typeof State.State) {
    const SYSTEM_PROMPT = `You are a LinkedIn post critique. Your task is to give feedback on the previously generated post by the writer agent.

Check against:
1) Strong hook in 1–2 lines
2) Beginner-friendly clarity; explain jargon with analogy/example
3) Specific insights and concrete examples (not generic advice)
4) Skimmable formatting (short lines, whitespace)
5) Clear CTA to follow for more
6) 160–220 words, no emojis, authentic tone, no buzzwords, no controversy

Output format (no scores, no questions, no meta):
Start with exactly:
"Revise now. Apply ALL changes below. Output only the revised post text."
Then list ONLY bullet-point FIXES (edit instructions). Do NOT include any rewritten sentences or paragraphs. Do NOT write the post.

Return only the fixes.`;

    const lastAIMessage = [...state.messages].reverse().find((m) => m.getType() === 'ai');

    const response = await model.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        lastAIMessage as AIMessage,
    ]);

    return {
        messages: [new HumanMessage(response.content as string)],
        revisions: state.revisions ? state.revisions + 1 : 1,
    };
}

function shouldContinue(state: typeof State.State) {
    if (state.revisions >= 5) {
        return END;
    }

    return 'critique';
}

export const graph = new StateGraph(State)
    .addNode('writer', writer)
    .addNode('critique', critique)
    .addEdge(START, 'writer')
    .addEdge('critique', 'writer')
    .addConditionalEdges('writer', shouldContinue, { [END]: END, critique: 'critique' });
