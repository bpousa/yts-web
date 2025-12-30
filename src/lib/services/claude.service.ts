/**
 * Claude API Service
 * Handles all interactions with the Anthropic Claude API
 */

import Anthropic from '@anthropic-ai/sdk'

// ============================================
// CONFIGURATION
// ============================================

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

// ============================================
// CLIENT INITIALIZATION
// ============================================

let claudeClient: Anthropic | null = null

function getClaudeClient(): Anthropic {
  if (!claudeClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }
    claudeClient = new Anthropic({ apiKey })
  }
  return claudeClient
}

// ============================================
// MESSAGE GENERATION
// ============================================

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeGenerationOptions {
  systemPrompt: string
  messages: ClaudeMessage[]
  maxTokens?: number
  temperature?: number
  stopSequences?: string[]
}

export interface ClaudeResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: string
}

/**
 * Generate a response from Claude
 */
export async function generateClaudeResponse(
  options: ClaudeGenerationOptions
): Promise<ClaudeResponse> {
  const client = getClaudeClient()

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: options.maxTokens || MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
    system: options.systemPrompt,
    messages: options.messages,
    stop_sequences: options.stopSequences,
  })

  // Extract text content from response
  const textContent = response.content.find(block => block.type === 'text')
  const content = textContent && 'text' in textContent ? textContent.text : ''

  return {
    content,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    stopReason: response.stop_reason || 'end_turn',
  }
}

/**
 * Simple helper for single-turn generation
 */
export async function generateContent(
  systemPrompt: string,
  userMessage: string,
  options?: Partial<ClaudeGenerationOptions>
): Promise<string> {
  const response = await generateClaudeResponse({
    systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    ...options,
  })

  return response.content
}

// ============================================
// STREAMING SUPPORT
// ============================================

export interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: Error) => void
}

/**
 * Generate a streaming response from Claude
 */
export async function generateClaudeResponseStreaming(
  options: ClaudeGenerationOptions,
  callbacks: StreamCallbacks
): Promise<ClaudeResponse> {
  const client = getClaudeClient()

  let fullText = ''
  let inputTokens = 0
  let outputTokens = 0
  let stopReason = 'end_turn'

  try {
    const stream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: options.maxTokens || MAX_TOKENS,
      temperature: options.temperature ?? 0.7,
      system: options.systemPrompt,
      messages: options.messages,
      stop_sequences: options.stopSequences,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta
        if ('text' in delta) {
          fullText += delta.text
          callbacks.onToken?.(delta.text)
        }
      } else if (event.type === 'message_delta') {
        if ('stop_reason' in event.delta && event.delta.stop_reason) {
          stopReason = event.delta.stop_reason
        }
      } else if (event.type === 'message_start' && event.message?.usage) {
        inputTokens = event.message.usage.input_tokens
      }
    }

    const finalMessage = await stream.finalMessage()
    outputTokens = finalMessage.usage.output_tokens

    callbacks.onComplete?.(fullText)
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
    throw error
  }

  return {
    content: fullText,
    usage: { inputTokens, outputTokens },
    stopReason,
  }
}

// ============================================
// TOKEN ESTIMATION
// ============================================

/**
 * Rough estimate of tokens in a string
 * Claude uses ~4 characters per token on average
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Check if content fits within context window
 */
export function fitsInContext(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxContextTokens: number = 200000
): boolean {
  let totalTokens = estimateTokens(systemPrompt)
  for (const msg of messages) {
    totalTokens += estimateTokens(msg.content)
  }
  return totalTokens < maxContextTokens * 0.9 // Leave 10% buffer
}
