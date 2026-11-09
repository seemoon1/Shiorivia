import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerLocalProvider } from "../../../lib/localProviderServer";
import { defaultModelForProvider } from "../../../lib/localProviders";
import { outputLanguageInstruction } from "../../../lib/locale";

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { text, previousLtm, mode, provider = "openrouter", model, uiLanguage, currentTitle } = await req.json();

    if (!text) return new Response(JSON.stringify({ error: "No text provided" }), { status: 400 });
    const selectedProvider = getServerLocalProvider(provider);
    if (!selectedProvider) return new Response(JSON.stringify({ error: "Provider not configured" }), { status: 400 });
    const routedModel = (typeof model === "string" && model.trim()) || defaultModelForProvider(selectedProvider.id);
    if (!routedModel) return new Response(JSON.stringify({ error: "Select a model for summarization" }), { status: 400 });

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "title") {
        systemPrompt = `You review titles for Shiorivia conversations. Compare the CURRENT title with the recent conversation and choose whether to keep it. If it accurately describes the conversation, return exactly KEEP. If it is vague, outdated, generic, or no longer matches the topic, generate ONE natural, specific, concise replacement (2–12 words or 4–18 CJK characters) in the selected UI language. For engineering, name the actual task; for stories/novels, reflect the established scene; for chat, reflect the topic. Use only the provided context. No quotes, markdown, explanations, fabricated details or punctuation-only answer. A former title may be stale after previous turns are deleted. An unchanged title is preferable whenever it remains accurate. KEEP is a fixed machine protocol token and MUST NOT be translated into the UI language.`;
        userPrompt = `[Current title]: ${typeof currentTitle === "string" ? currentTitle.slice(0, 160) : ""}
[Recent conversation excerpt]:
${String(text).slice(0, 3500)}

Output KEEP or a single suitable replacement title:`;
    } else if (mode === 'novel_chapter') {
        systemPrompt = `
You are a 'Novel Plot Recorder'.
Your task is to summarize the EVENTS of the provided novel chapter into 1-3 concise sentences.
[Rules]:
1. Focus on WHAT happened and WHAT changed (e.g., "A and B entered the room and did X. B felt Y.").
2. Ignore flowery descriptions, focus on actions and psychological shifts.
3. Output language: Follow the selected Shiorivia locale, not necessarily the input language.
`;
        userPrompt = `[Chapter Content to Summarize]:\n${text}`;
    } 
    else if (mode === 'micro') {
        systemPrompt = `
You are a 'Micro-Memory Encoder'. 
Your task is to compress a SINGLE turn of dialogue into a concise, 3rd-person summary sentence.
Rules:
1. Ignore pleasantries.
2. Focus on the core intent.
3. Output ONE or TWO sentences maximum.
4. Output language: Follow the selected Shiorivia locale.
`;
        userPrompt = `[Dialogue to Compress]:\n${text}`;
    } 
    else {
        systemPrompt = `
You are a 'Long-Term Memory Engine'.
Your task is to merge "Recent Short-Term Memory" into "Previous Long-Term Memory".
Rules:
1. Keep the output organized (bullet points).
2. Update facts.
3. Output language: Follow the selected Shiorivia locale.
`;
        userPrompt = `[Previous LTM]:\n${previousLtm || "None"}\n\n[Recent STM]:\n${text}\n\nGenerate updated LTM:`;
    }

    systemPrompt += "\n\n" + outputLanguageInstruction(uiLanguage);
    let summary = "";
    if (selectedProvider.id === "google") {
      const genAI = new GoogleGenerativeAI(selectedProvider.apiKey);
      const response = await genAI.getGenerativeModel({ model: routedModel.replace(/^google\//, "") })
        .generateContent(`${systemPrompt}\n\n${userPrompt}`);
      summary = response.response.text();
    } else {
      const client = new OpenAI({ apiKey: selectedProvider.apiKey, baseURL: selectedProvider.baseURL });
      const response = await client.chat.completions.create({
        model: routedModel,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.3,
        max_tokens: mode === "title" ? 100 : 500,
      });
      summary = response.choices[0]?.message?.content || "";
    }
    if (mode === "title") {
        summary = String(summary).split(/\r?\n/)[0].replace(/<[^>]+>/g, "").replace(/^[\s\"'`*#]+|[\s\"'`*#]+$/g, "").trim().slice(0, 60);
        if (/^KEEP[.!]?$/i.test(summary)) summary = "KEEP";
    }
    return new Response(JSON.stringify({ summary }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}