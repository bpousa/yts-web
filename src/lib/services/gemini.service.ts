/**
 * Gemini API Service
 * Handles image generation using Google's Gemini 2.0 Flash
 * Ported from: /mnt/c/Projects/yts/pages/Content_Generator.py
 */

import { GoogleGenAI, type GenerateContentResponse } from '@google/genai'

// ============================================
// CONFIGURATION
// ============================================

const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation'

// ============================================
// CLIENT INITIALIZATION
// ============================================

let geminiClient: GoogleGenAI | null = null

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not configured')
    }
    geminiClient = new GoogleGenAI({ apiKey })
  }
  return geminiClient
}

// ============================================
// IMAGE GENERATION
// ============================================

export interface ImageGenerationOptions {
  prompt: string
  negativePrompt?: string
  aspectRatio?: '16:9' | '1:1' | '9:16'
  numberOfImages?: number
}

export interface GeneratedImage {
  base64: string
  mimeType: string
}

export interface ImageGenerationResult {
  images: GeneratedImage[]
  prompt: string
}

/**
 * Generate images using Gemini
 */
export async function generateImages(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const client = getGeminiClient()

  // Build the full prompt
  let fullPrompt = options.prompt
  if (options.negativePrompt) {
    fullPrompt += `\n\nAvoid: ${options.negativePrompt}`
  }

  // Add aspect ratio hint to prompt
  if (options.aspectRatio) {
    const ratioDescriptions: Record<string, string> = {
      '16:9': 'wide landscape format, 16:9 aspect ratio',
      '1:1': 'square format, 1:1 aspect ratio',
      '9:16': 'tall portrait format, 9:16 aspect ratio for mobile',
    }
    fullPrompt += `\n\nImage format: ${ratioDescriptions[options.aspectRatio]}`
  }

  const response: GenerateContentResponse = await client.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: fullPrompt,
    config: {
      responseModalities: ['image', 'text'],
    },
  })

  // Extract images from response
  const images: GeneratedImage[] = []

  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        images.push({
          base64: part.inlineData.data || '',
          mimeType: part.inlineData.mimeType,
        })
      }
    }
  }

  if (images.length === 0) {
    throw new Error('No images were generated')
  }

  return {
    images,
    prompt: options.prompt,
  }
}

/**
 * Generate a single image and return as base64 data URL
 */
export async function generateSingleImage(
  prompt: string,
  aspectRatio: '16:9' | '1:1' | '9:16' = '16:9'
): Promise<string> {
  const result = await generateImages({
    prompt,
    aspectRatio,
    numberOfImages: 1,
  })

  if (result.images.length === 0) {
    throw new Error('No image was generated')
  }

  const image = result.images[0]
  return `data:${image.mimeType};base64,${image.base64}`
}

// ============================================
// IMAGE EDITING (PLACEHOLDER)
// ============================================

export interface ImageEditOptions {
  imageBase64: string
  editPrompt: string
  maskBase64?: string
}

/**
 * Edit an existing image (placeholder for future implementation)
 */
export async function editImage(_options: ImageEditOptions): Promise<GeneratedImage> {
  throw new Error('Image editing not yet implemented')
}

// ============================================
// HELPERS
// ============================================

/**
 * Convert base64 to Buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64')
}

/**
 * Get file extension from mime type
 */
export function mimeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[mimeType] || 'png'
}

/**
 * Validate prompt for image generation
 */
export function validateImagePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' }
  }

  if (prompt.length > 2000) {
    return { valid: false, error: 'Prompt is too long. Maximum 2000 characters.' }
  }

  return { valid: true }
}

// ============================================
// ERROR HANDLING
// ============================================

export function isGeminiError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('Gemini') ||
    error.message.includes('GoogleGenAI')
  )
}

export function formatGeminiError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('SAFETY')) {
      return 'Image generation was blocked due to safety filters. Please try a different prompt.'
    }
    if (error.message.includes('rate')) {
      return 'Image generation rate limit reached. Please wait a moment and try again.'
    }
    if (error.message.includes('quota')) {
      return 'Image generation quota exceeded. Please try again later.'
    }
    return `Image generation failed: ${error.message}`
  }
  return 'Unknown image generation error'
}
