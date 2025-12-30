/**
 * Image Generation Prompts
 * Ported from: /mnt/c/Projects/yts/pages/Content_Generator.py
 *
 * Generates prompts for Gemini 3 Pro Image API
 */

// ============================================
// IMAGE STYLE DEFINITIONS
// ============================================

export const IMAGE_STYLES = {
  photorealistic: {
    name: 'Photorealistic',
    description: 'High-quality, realistic photography style',
    promptPrefix: 'Professional photograph, ultra-realistic, high resolution, sharp focus, natural lighting,',
    promptSuffix: '8K quality, professional photography, detailed textures',
  },
  cartoon: {
    name: 'Cartoon',
    description: 'Fun, illustrated cartoon style',
    promptPrefix: 'Cartoon illustration, vibrant colors, clean lines, playful style,',
    promptSuffix: 'vector art style, bold outlines, friendly appearance',
  },
  infographic: {
    name: 'Infographic',
    description: 'Clean, data-visualization style',
    promptPrefix: 'Clean infographic design, minimalist, professional data visualization,',
    promptSuffix: 'white background, clear typography, modern design elements',
  },
  '3d-render': {
    name: '3D Render',
    description: 'Polished 3D rendered graphics',
    promptPrefix: '3D render, high-quality CGI, studio lighting, glossy materials,',
    promptSuffix: 'octane render, volumetric lighting, depth of field',
  },
  minimalist: {
    name: 'Minimalist',
    description: 'Simple, clean, modern aesthetic',
    promptPrefix: 'Minimalist design, clean composition, simple shapes, negative space,',
    promptSuffix: 'modern aesthetic, subtle colors, elegant simplicity',
  },
  'hand-drawn': {
    name: 'Hand-Drawn',
    description: 'Sketch or illustration style',
    promptPrefix: 'Hand-drawn illustration, artistic sketch, pencil or ink style,',
    promptSuffix: 'organic lines, artistic texture, authentic hand-crafted feel',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Futuristic, neon-lit aesthetic',
    promptPrefix: 'Cyberpunk style, neon lights, futuristic cityscape, high-tech,',
    promptSuffix: 'rain-slicked streets, holographic elements, dystopian atmosphere',
  },
  'oil-painting': {
    name: 'Oil Painting',
    description: 'Classical fine art painting style',
    promptPrefix: 'Oil painting style, classical art technique, rich textures, brush strokes visible,',
    promptSuffix: 'museum quality, dramatic lighting, fine art aesthetic',
  },
  'corporate-tech': {
    name: 'Corporate Tech',
    description: 'Professional business/technology imagery',
    promptPrefix: 'Corporate technology image, professional business setting, clean modern office,',
    promptSuffix: 'diverse professionals, modern technology, bright and optimistic',
  },
} as const

export type ImageStyle = keyof typeof IMAGE_STYLES

// ============================================
// IMAGE MOOD DEFINITIONS
// ============================================

export const IMAGE_MOODS = {
  professional: {
    name: 'Professional',
    description: 'Clean, business-appropriate',
    modifiers: 'professional atmosphere, corporate setting, polished appearance, confident mood',
  },
  vibrant: {
    name: 'Vibrant',
    description: 'Bright, energetic, eye-catching',
    modifiers: 'vibrant colors, high energy, dynamic composition, exciting atmosphere',
  },
  'dark-moody': {
    name: 'Dark & Moody',
    description: 'Dramatic, intense, atmospheric',
    modifiers: 'dark atmosphere, dramatic shadows, moody lighting, intense mood',
  },
  'soft-light': {
    name: 'Soft Light',
    description: 'Warm, gentle, inviting',
    modifiers: 'soft lighting, warm tones, gentle atmosphere, inviting mood, golden hour',
  },
  futuristic: {
    name: 'Futuristic',
    description: 'Modern, innovative, forward-looking',
    modifiers: 'futuristic design, innovative technology, forward-looking, cutting-edge aesthetic',
  },
} as const

export type ImageMood = keyof typeof IMAGE_MOODS

// ============================================
// ASPECT RATIO DEFINITIONS
// ============================================

export const ASPECT_RATIOS = {
  '16:9': {
    name: 'Landscape (16:9)',
    description: 'YouTube thumbnails, presentations',
    width: 1792,
    height: 1024,
  },
  '1:1': {
    name: 'Square (1:1)',
    description: 'Instagram, profile images',
    width: 1024,
    height: 1024,
  },
  '9:16': {
    name: 'Portrait (9:16)',
    description: 'Stories, TikTok, Reels',
    width: 1024,
    height: 1792,
  },
} as const

export type AspectRatio = keyof typeof ASPECT_RATIOS

// ============================================
// PROMPT BUILDER
// ============================================

export interface ImageGenerationOptions {
  subject: string
  style: ImageStyle
  mood: ImageMood
  aspectRatio: AspectRatio
  customPrompt?: string
  negativePrompt?: string
}

/**
 * Build a complete image generation prompt
 */
export function buildImagePrompt(options: ImageGenerationOptions): string {
  const styleConfig = IMAGE_STYLES[options.style]
  const moodConfig = IMAGE_MOODS[options.mood]

  const parts: string[] = []

  // Add style prefix
  parts.push(styleConfig.promptPrefix)

  // Add main subject
  parts.push(options.subject)

  // Add mood modifiers
  parts.push(moodConfig.modifiers)

  // Add custom prompt if provided
  if (options.customPrompt) {
    parts.push(options.customPrompt)
  }

  // Add style suffix
  parts.push(styleConfig.promptSuffix)

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Build negative prompt (things to avoid in the image)
 */
export function buildNegativePrompt(customNegative?: string): string {
  const defaultNegatives = [
    'blurry',
    'low quality',
    'distorted',
    'watermark',
    'text overlay',
    'logo',
    'signature',
    'cropped',
    'out of frame',
    'ugly',
    'deformed',
    'noisy',
    'grainy',
  ]

  if (customNegative) {
    return [...defaultNegatives, customNegative].join(', ')
  }

  return defaultNegatives.join(', ')
}

// ============================================
// CONTENT-BASED PROMPT GENERATION
// ============================================

export const IMAGE_FROM_CONTENT_SYSTEM_PROMPT = `You are an expert at creating visual prompts for AI image generation. Given written content, you will create a detailed prompt for generating a compelling featured image.

## YOUR TASK
Analyze the content and create an image prompt that:
1. Captures the main theme or message
2. Would work as a thumbnail or featured image
3. Is visually interesting and scroll-stopping
4. Avoids clichés (no handshakes, lightbulbs, generic office scenes)

## OUTPUT FORMAT
Return a JSON object:
{
  "mainSubject": "Detailed description of the primary visual element",
  "composition": "How elements should be arranged",
  "colorPalette": "Suggested colors that match the content mood",
  "visualMetaphors": ["Creative visual ideas that represent the concepts"],
  "avoidElements": ["Things that would be cliché or inappropriate"]
}

## GUIDELINES
- Be specific and descriptive
- Think creatively, avoid generic stock photo ideas
- Consider what would make someone click
- Match the tone of the content (serious content = serious imagery)
`

export function buildContentToImageMessage(content: string, format?: string): string {
  let message = `Create an image prompt for the following ${format || 'content'}:\n\n---\n${content.substring(0, 2000)}\n---\n\n`
  message += 'Generate a creative image concept as a JSON object.'

  return message
}

// ============================================
// IMAGE SUGGESTION TYPES
// ============================================

export interface ImageSuggestion {
  mainSubject: string
  composition: string
  colorPalette: string
  visualMetaphors: string[]
  avoidElements: string[]
}

/**
 * Parse image suggestion response from Claude
 */
export function parseImageSuggestionResponse(response: string): ImageSuggestion | null {
  try {
    let jsonStr = response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonStr.trim())

    return {
      mainSubject: String(parsed.mainSubject || ''),
      composition: String(parsed.composition || ''),
      colorPalette: String(parsed.colorPalette || ''),
      visualMetaphors: Array.isArray(parsed.visualMetaphors) ? parsed.visualMetaphors : [],
      avoidElements: Array.isArray(parsed.avoidElements) ? parsed.avoidElements : [],
    }
  } catch {
    return null
  }
}

/**
 * Convert image suggestion to a generation prompt
 */
export function suggestionToPrompt(
  suggestion: ImageSuggestion,
  style: ImageStyle,
  mood: ImageMood
): string {
  const subject = `${suggestion.mainSubject}. ${suggestion.composition}. Color palette: ${suggestion.colorPalette}`

  return buildImagePrompt({
    subject,
    style,
    mood,
    aspectRatio: '16:9',
  })
}
