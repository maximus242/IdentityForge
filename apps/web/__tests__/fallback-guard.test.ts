/** @jest-environment node */

import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

describe('Fallback guardrails', () => {
  it('does not contain hardcoded demo coach messages in coach page', () => {
    const coachPage = read('src/pages/coach.tsx');

    expect(coachPage).not.toContain('getWelcomeMessage');
    expect(coachPage).not.toContain('addDemoResponse');
    expect(coachPage).not.toContain("I hear you. Let's explore that further.");
    expect(coachPage).not.toContain("I'd love to help you discover your core values.");
  });

  it('does not contain heuristic demo responders in values discovery page', () => {
    const valuesPage = read('src/pages/values-discovery.tsx');

    expect(valuesPage).not.toContain('addDemoResponse');
    expect(valuesPage).not.toContain('shortResponses');
    expect(valuesPage).not.toContain('mediumResponses');
    expect(valuesPage).not.toContain('longResponses');
    expect(valuesPage).not.toContain("That's interesting. Can you share more about how it made you feel?");
  });

  it('conversation engine requires OPENROUTER_API_KEY and has no local fallback responders', () => {
    const engine = read('../../packages/ai/src/conversation-engine.ts');

    expect(engine).toContain("throw new Error('OPENROUTER_API_KEY not configured')");
    expect(engine).not.toContain('localFallbackMessage');
    expect(engine).not.toContain('getDefaultPrompt');
  });
});
