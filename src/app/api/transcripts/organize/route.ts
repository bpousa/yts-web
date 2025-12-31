/**
 * AI Organization API
 * POST /api/transcripts/organize - Organize transcripts into folders using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface OrganizeSuggestion {
  transcriptId: string
  suggestedProject: string
  confidence: number
  reason: string
}

// ============================================
// POST - Organize Transcripts with AI
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body
    const body = await request.json()
    const { transcriptIds, mode = 'suggest' } = body

    if (!Array.isArray(transcriptIds) || transcriptIds.length === 0) {
      return NextResponse.json(
        { error: 'transcriptIds array is required' },
        { status: 400 }
      )
    }

    // Fetch transcripts to organize
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('id, video_title, content')
      .eq('user_id', user.id)
      .in('id', transcriptIds)

    if (transcriptsError) {
      return NextResponse.json({ error: transcriptsError.message }, { status: 500 })
    }

    if (!transcripts || transcripts.length === 0) {
      return NextResponse.json({ error: 'No transcripts found' }, { status: 404 })
    }

    // Fetch existing projects for context
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('user_id', user.id)

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 500 })
    }

    // Build context for AI
    const projectList = (projects || []).map(p => `- ${p.name}: ${p.description || 'No description'}`).join('\n')

    const transcriptSummaries = transcripts.map(t => ({
      id: t.id,
      title: t.video_title,
      preview: t.content.substring(0, 500),
    }))

    // Call Claude to analyze and suggest folders
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are organizing YouTube transcript files into folders/projects based on their content.

EXISTING FOLDERS:
${projectList || 'No existing folders'}

TRANSCRIPTS TO ORGANIZE:
${transcriptSummaries.map(t => `
ID: ${t.id}
Title: ${t.title}
Preview: ${t.preview}...
---`).join('\n')}

For each transcript, suggest which existing folder it belongs in, OR suggest a new folder name if none of the existing folders are a good fit.

Respond in JSON format:
{
  "suggestions": [
    {
      "transcriptId": "id",
      "suggestedProject": "Folder Name",
      "isNewFolder": false,
      "confidence": 0.9,
      "reason": "Brief reason"
    }
  ]
}

Rules:
- Use existing folder names when possible (prefer matches over creating new folders)
- Create new folders only when content clearly doesn't fit existing categories
- New folder names should be 2-4 words, descriptive, and professional
- Confidence should be 0.5-1.0 based on how well the content matches
- Group similar topics together (e.g., same speaker, same series, same topic)`,
        },
      ],
    })

    // Parse AI response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    let aiResponse: { suggestions: Array<{
      transcriptId: string
      suggestedProject: string
      isNewFolder?: boolean
      confidence: number
      reason: string
    }> }

    try {
      aiResponse = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: responseText },
        { status: 500 }
      )
    }

    // If mode is 'suggest', just return suggestions
    if (mode === 'suggest') {
      return NextResponse.json({
        suggestions: aiResponse.suggestions,
        existingProjects: projects?.map(p => p.name) || [],
      })
    }

    // If mode is 'apply', actually organize the transcripts
    let organized = 0
    const results: Array<{ transcriptId: string; projectId: string; projectName: string }> = []

    for (const suggestion of aiResponse.suggestions) {
      // Find or create project
      let projectId: string | null = null
      let projectName = suggestion.suggestedProject

      // Check if project exists
      const existingProject = projects?.find(
        p => p.name.toLowerCase() === suggestion.suggestedProject.toLowerCase()
      )

      if (existingProject) {
        projectId = existingProject.id
        projectName = existingProject.name
      } else if (suggestion.isNewFolder !== false) {
        // Create new project
        const { data: newProject, error: createError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: suggestion.suggestedProject,
            description: `Auto-created by AI organization`,
          })
          .select('id, name')
          .single()

        if (!createError && newProject) {
          projectId = newProject.id
          projectName = newProject.name
          // Add to projects array for subsequent lookups
          projects?.push({ id: newProject.id, name: newProject.name, description: null })
        }
      }

      if (projectId) {
        // Update transcript
        const { error: updateError } = await supabase
          .from('transcripts')
          .update({ project_id: projectId })
          .eq('id', suggestion.transcriptId)
          .eq('user_id', user.id)

        if (!updateError) {
          organized++
          results.push({
            transcriptId: suggestion.transcriptId,
            projectId,
            projectName,
          })
        }
      }
    }

    return NextResponse.json({
      organized,
      total: transcripts.length,
      results,
      suggestions: aiResponse.suggestions,
    })
  } catch (error) {
    console.error('POST /api/transcripts/organize error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
