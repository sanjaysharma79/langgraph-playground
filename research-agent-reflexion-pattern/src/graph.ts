import { AIMessage } from '@langchain/core/messages';
import { llm } from './model';
import { graphState, questionAnswerSchema } from './state';
import { StateGraph } from '@langchain/langgraph';
import { searchExecutor } from './tools';

async function responder(state: typeof graphState.State) {
    const currentDateTime = new Date().toLocaleString('sv-SE');

    const SYSTEM_PROMPT = `You are an expert researcher.
Current time: ${currentDateTime}

1. Provide a detailed ~250 word answer.
2. Reflect and critique your answer. Be severe to maximize improvement.
3. Recommend max 3 search queries to research information and improve your answer.`;

    const llmWithStructure = llm.withStructuredOutput(questionAnswerSchema);

    const response = await llmWithStructure.invoke([
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
        ...state.messages,
        {
            role: 'system',
            content: `Reflect on the user's original question and the actions taken thus far. Respond using structured output.`,
        },
    ]);

    return {
        messages: [new AIMessage(JSON.stringify(response))],
        iteration: 0,
    };
}

async function revisor(state: typeof graphState.State) {
    const currentDateTime = new Date().toLocaleString('sv-SE');

    const SYSTEM_PROMPT = `You are an expert researcher.
Current time: ${currentDateTime}

Your task is to revise your previous answer using the search results provided.

CRITICAL - Answer Format Requirements:
Your "answer" field MUST have this exact structure:

[Main answer content with citations like [1], [2], [3]...]

References:
- [1] https://actual-url-from-search-results.com
- [2] https://another-url-from-search-results.com
- [3] https://third-url-from-search-results.com

Instructions:
1. Write your main answer (~250 words) using information from the search results
2. Use inline citations [1], [2], [3] in your answer text when referencing sources
3. MANDATORY: End your answer field with a "References:" section listing all URLs
4. The References section is PART of the answer field, not a separate field
5. Extract actual URLs from the search results provided in the conversation
6. Use the previous critique to remove superfluous information
7. Recommend max 3 new search queries to research information and improve your answer.

Example answer field format:
JavaScript is evolving rapidly with new features [1]. WebAssembly integration is improving [2].

References:
- [1] https://example.com/js-features
- [2] https://example.com/webassembly`;

    const llmWithStructure = llm.withStructuredOutput(questionAnswerSchema);

    const response = await llmWithStructure.invoke([
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
        ...state.messages,
        {
            role: 'system',
            content: `Reflect on the user's original question and the actions taken thus far. Respond using structured output.`,
        },
    ]);

    return {
        messages: [new AIMessage(JSON.stringify(response))],
        iteration: state.iteration + 1,
    };
}

export const graph = new StateGraph(graphState)
    .addNode('responder', responder)
    .addNode('searchExecutor', searchExecutor)
    .addNode('revisor', revisor)

    .addEdge('__start__', 'responder')
    .addEdge('responder', 'searchExecutor')
    .addEdge('searchExecutor', 'revisor')

    .addConditionalEdges(
        'revisor',
        (state: typeof graphState.State) => {
            const MAX_ITERATIONS = 2;

            if (state.iteration >= MAX_ITERATIONS) {
                return '__end__';
            }

            return 'searchExecutor';
        },
        {
            __end__: '__end__',
            searchExecutor: 'searchExecutor',
        }
    );
