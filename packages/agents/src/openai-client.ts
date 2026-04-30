/**
 * OpenAI client + typed structured-output helpers.
 *
 * All agents import from here so that mock/test injection is trivial:
 * just replace the default export before calling the agent.
 */

import OpenAI from "openai";

export const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
