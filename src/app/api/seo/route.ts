/**
 * SEO Analysis API
 * POST /api/seo - Analyze content for SEO
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seoAnalysisSchema } from '@/lib/utils/validators'
import { analyzeSEO, scoreContent } from '@/lib/services/seo.service'
import { updateContent, getContentById } from '@/lib/services/content.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = seoAnalysisSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { contentId, content } = validationResult.data

    // Verify content ownership if contentId provided
    if (contentId) {
      const existingContent = await getContentById(contentId, user.id)
      if (!existingContent) {
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      }
    }

    // Analyze SEO
    const seoAnalysis = await analyzeSEO({
      content,
      targetKeyword: body.targetKeyword,
    })

    // Get content score
    const contentScore = await scoreContent(content)

    // Save SEO data to content if contentId provided
    if (contentId) {
      await updateContent(contentId, user.id, {
        seoData: {
          ...seoAnalysis,
          contentScore,
          analyzedAt: new Date().toISOString(),
        },
      })
    }

    return NextResponse.json({
      seo: seoAnalysis,
      score: contentScore,
    })
  } catch (error) {
    console.error('POST /api/seo error:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
