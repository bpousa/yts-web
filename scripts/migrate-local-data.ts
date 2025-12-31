/**
 * Migration Script: Local YTS Data to Supabase
 *
 * Run with: npx tsx scripts/migrate-local-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// Configuration
const SUPABASE_URL = 'https://fakxlxggvkwswbspkics.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha3hseGdndmt3c3dic3BraWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0NTQwOCwiZXhwIjoyMDgyNjIxNDA4fQ.x4-sz5pViiY3muKN_lDzEX79vSMlnPpN24i3ghUS3Nc'

const USER_EMAIL = 'mike@appendment.com'
const USER_PASSWORD = 'Mike4Ever!'

const LOCAL_YTS_PATH = '/mnt/c/Projects/yts'
const TRANSCRIPTS_PATH = path.join(LOCAL_YTS_PATH, 'transcripts')
const TONE_PROFILES_PATH = path.join(LOCAL_YTS_PATH, 'tone_profiles')

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Project name mappings based on content analysis
const PROJECT_NAME_PATTERNS: { [key: string]: string[] } = {
  'Straight Line Sales - Jordan Belfort': ['jordan belfort', 'wolf of wall street', 'looping', 'straight line'],
  'Negotiation Tactics - Chris Voss': ['chris voss', 'never split', 'fbi negotiation', 'mirror', 'label'],
  '8% Nation Insurance Conference': ['8% nation', 'cody askins', 'insurance agent'],
  'Sales Psychology & Persuasion': ['psychology', 'persuasion', 'influence', 'sales'],
  'Business Strategy': ['business', 'strategy', 'entrepreneur'],
  'Marketing & Branding': ['marketing', 'brand', 'content'],
  'Personal Development': ['mindset', 'motivation', 'success'],
}

// HTML entity decoder
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// Generate a pseudo video ID from title
function generateVideoId(title: string): string {
  const hash = crypto.createHash('sha256').update(title).digest('hex')
  return hash.substring(0, 11)
}

// Determine project name from file names in folder
function determineProjectName(files: string[]): string {
  const combinedText = files.join(' ').toLowerCase()

  for (const [projectName, patterns] of Object.entries(PROJECT_NAME_PATTERNS)) {
    for (const pattern of patterns) {
      if (combinedText.includes(pattern)) {
        return projectName
      }
    }
  }

  // If no pattern matches, use first file's main topic
  if (files.length > 0) {
    const firstFile = decodeHtmlEntities(files[0].replace('.txt', ''))
    // Extract first few words as topic
    const words = firstFile.split(/[\s\-–—]+/).slice(0, 4).join(' ')
    return words || 'Imported Transcripts'
  }

  return 'Imported Transcripts'
}

async function main() {
  console.log('Starting YTS Data Migration...\n')

  // Step 1: Create user account
  console.log('Step 1: Creating user account...')
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: USER_EMAIL,
    password: USER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: 'Mike'
    }
  })

  if (userError) {
    if (userError.message.includes('already been registered')) {
      console.log('  User already exists, fetching user ID...')
      // Get existing user
      const { data: users } = await supabase.auth.admin.listUsers()
      const existingUser = users?.users?.find(u => u.email === USER_EMAIL)
      if (!existingUser) {
        console.error('  Could not find existing user!')
        process.exit(1)
      }
      console.log(`  Found existing user: ${existingUser.id}`)
      var userId = existingUser.id
    } else {
      console.error('  Error creating user:', userError.message)
      process.exit(1)
    }
  } else {
    userId = userData.user.id
    console.log(`  Created user: ${userId}`)
  }

  // Step 2: Scan transcript folders and create projects
  console.log('\nStep 2: Scanning transcript folders...')
  const transcriptFolders = fs.readdirSync(TRANSCRIPTS_PATH)
    .filter(f => fs.statSync(path.join(TRANSCRIPTS_PATH, f)).isDirectory())
    .sort()

  console.log(`  Found ${transcriptFolders.length} folders`)

  const projectMap: Map<string, string> = new Map() // projectName -> projectId
  const folderProjectMap: Map<string, string> = new Map() // folder -> projectId

  for (const folder of transcriptFolders) {
    const folderPath = path.join(TRANSCRIPTS_PATH, folder)
    const files = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.txt'))

    if (files.length === 0) continue

    const projectName = determineProjectName(files)

    // Check if project already created
    if (!projectMap.has(projectName)) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: projectName,
          description: `Imported from local YTS app (${folder})`
        })
        .select()
        .single()

      if (projectError) {
        console.error(`  Error creating project "${projectName}":`, projectError.message)
        continue
      }

      projectMap.set(projectName, project.id)
      console.log(`  Created project: "${projectName}" (${project.id})`)
    }

    folderProjectMap.set(folder, projectMap.get(projectName)!)
  }

  console.log(`  Created ${projectMap.size} projects`)

  // Step 3: Import transcripts
  console.log('\nStep 3: Importing transcripts...')
  let transcriptCount = 0
  let errorCount = 0

  for (const folder of transcriptFolders) {
    const folderPath = path.join(TRANSCRIPTS_PATH, folder)
    const projectId = folderProjectMap.get(folder)

    if (!projectId) continue

    const files = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.txt'))

    for (const file of files) {
      const filePath = path.join(folderPath, file)
      const title = decodeHtmlEntities(file.replace('.txt', ''))
      const content = fs.readFileSync(filePath, 'utf-8')
      const videoId = generateVideoId(title)

      const { error: transcriptError } = await supabase
        .from('transcripts')
        .insert({
          user_id: userId,
          project_id: projectId,
          video_id: videoId,
          video_title: title,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          content: content,
          has_timestamps: false,
          source: 'official'
        })

      if (transcriptError) {
        console.error(`  Error importing "${title}":`, transcriptError.message)
        errorCount++
      } else {
        transcriptCount++
      }
    }
  }

  console.log(`  Imported ${transcriptCount} transcripts (${errorCount} errors)`)

  // Step 4: Import tone profile
  console.log('\nStep 4: Importing tone profile...')
  const toneFiles = fs.readdirSync(TONE_PROFILES_PATH)
    .filter(f => f.endsWith('.txt'))

  for (const file of toneFiles) {
    const filePath = path.join(TONE_PROFILES_PATH, file)
    const name = file.replace('.txt', '')
    const styleDna = fs.readFileSync(filePath, 'utf-8')

    const { error: toneError } = await supabase
      .from('tone_profiles')
      .insert({
        user_id: userId,
        name: name,
        style_dna: styleDna
      })

    if (toneError) {
      console.error(`  Error importing tone profile "${name}":`, toneError.message)
    } else {
      console.log(`  Imported tone profile: "${name}"`)
    }
  }

  // Step 5: Create webhook configuration
  console.log('\nStep 5: Creating webhook configuration...')
  const { error: webhookError } = await supabase
    .from('webhook_configs')
    .insert({
      user_id: userId,
      name: 'Appendment Blog',
      description: 'Publish generated content to appendment.com blog',
      endpoint_url: 'https://appendment.com/.netlify/functions/blog-webhook',
      http_method: 'POST',
      auth_type: 'custom_header',
      auth_config: {
        header_name: 'x-admin-secret',
        header_value: '9f3c8e7a4b1d6f2a0c5e8d9b4a7f1c2e6d0b9a3f8c5e7a2d4b6f1e0c9a8b'
      },
      payload_template: {
        secret: '{{auth}}',
        post: {
          title: '{{title}}',
          content: '{{content}}',
          excerpt: '{{excerpt}}',
          category: '{{category}}',
          tags: '{{tags}}'
        }
      },
      enabled: true
    })

  if (webhookError) {
    console.error('  Error creating webhook:', webhookError.message)
  } else {
    console.log('  Created webhook: "Appendment Blog"')
  }

  // Summary
  console.log('\n========================================')
  console.log('Migration Complete!')
  console.log('========================================')
  console.log(`User: ${USER_EMAIL}`)
  console.log(`Password: ${USER_PASSWORD}`)
  console.log(`Projects: ${projectMap.size}`)
  console.log(`Transcripts: ${transcriptCount}`)
  console.log(`Tone Profiles: ${toneFiles.length}`)
  console.log(`Webhooks: 1`)
  console.log('\nYou can now log in at: https://yts.appendment.com/login')
}

main().catch(console.error)
