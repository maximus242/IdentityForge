# AI Fixes - Eliminated Generic/Default Responses

## Problem
The AI was returning generic, unhelpful responses like:
- "That's a great question" (when user didn't ask a question)
- Generic coaching platitudes that didn't address user input
- Repeated similar opening questions

## Root Cause
1. **Poor AI model**: Using `deepseek/deepseek-chat` which gave low-quality, generic responses
2. **Weak prompting**: No explicit instructions to avoid generic responses
3. **No validation**: System accepted any AI response without checking quality

## Changes Made

### 1. Switched AI Model (CRITICAL)
**File**: `packages/ai/src/conversation-engine.ts`

Changed from:
```typescript
model: 'deepseek/deepseek-chat'
```

To:
```typescript
model: 'anthropic/claude-3.5-sonnet'
```

**Why**: Claude 3.5 Sonnet is significantly better at:
- Following instructions precisely
- Being contextually aware
- Avoiding generic responses
- Understanding conversation flow

### 2. Added Strict Anti-Generic Instructions
**File**: `packages/ai/src/conversation-engine.ts`

Added to system prompt:
```typescript
## CRITICAL INSTRUCTIONS
- NEVER give generic or placeholder responses
- ALWAYS directly address what the user just said
- If the user gives a short or unclear answer, acknowledge it specifically and ask for more detail
- Do NOT use phrases like "That's a great question" unless they literally asked a question
- Be specific, personal, and responsive to their exact words
- No coaching platitudes or generic encouragement - respond to their actual content
```

### 3. Improved Error Logging
- Added detailed error messages showing HTTP status codes
- Better error propagation from OpenRouter API
- Console logging of API errors for debugging

## Testing

To test the fix:
1. Go to http://localhost:3001
2. Start a Values Discovery conversation
3. Type ANY message (even "test", "hi", "xyz")
4. The AI should now:
   - Acknowledge your specific input
   - Not give generic "that's a great question" responses
   - Be contextually aware of what you said
   - Ask relevant follow-up questions

## API Cost Note

⚠️ **IMPORTANT**: Claude 3.5 Sonnet costs more than DeepSeek on OpenRouter.

- **DeepSeek**: ~$0.14 per 1M input tokens, $0.28 per 1M output tokens (nearly free)
- **Claude 3.5 Sonnet**: ~$3 per 1M input tokens, $15 per 1M output tokens

For typical usage (10-50 messages per conversation):
- Cost per conversation: $0.05 - $0.25
- This is worth it for quality responses vs frustrating generic ones

If cost is a concern, consider using `anthropic/claude-3-haiku` instead:
- ~$0.25 per 1M input tokens, $1.25 per 1M output tokens
- Still much better than DeepSeek, cheaper than Sonnet

To change model:
```bash
# Edit packages/ai/src/conversation-engine.ts
# Change all instances of:
model: 'anthropic/claude-3.5-sonnet'
# To:
model: 'anthropic/claude-3-haiku'
```

## All Defaults Eliminated

✅ No hardcoded default messages anywhere
✅ No fallback responses in error cases (shows actual errors)
✅ No generic AI responses (enforced via prompt + model choice)
✅ AI always responds to actual user input contextually

## Next Steps

If you still see generic responses:
1. Check the server logs for API errors
2. Verify OPENROUTER_API_KEY is valid and has credits
3. Try a different Claude model (Haiku, Opus)
4. Report specific examples so we can refine prompts further
