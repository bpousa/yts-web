/**
 * Fix Webhook Configuration for mike@appendment.com
 *
 * Run with: npx tsx scripts/fix-webhook-config.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fakxlxggvkwswbspkics.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha3hseGdndmt3c3dic3BraWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0NTQwOCwiZXhwIjoyMDgyNjIxNDA4fQ.x4-sz5pViiY3muKN_lDzEX79vSMlnPpN24i3ghUS3Nc'

const USER_EMAIL = 'mike@appendment.com'
const BLOG_ADMIN_SECRET = '9f3c8e7a4b1d6f2a0c5e8d9b4a7f1c2e6d0b9a3f8c5e7a2d4b6f1e0c9a8b'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('Fixing webhook configuration...\n')

  // Get user ID
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.find(u => u.email === USER_EMAIL)

  if (!user) {
    console.error('User not found:', USER_EMAIL)
    process.exit(1)
  }

  console.log('Found user:', user.id)

  // Find existing webhook
  const { data: webhooks, error: fetchError } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('user_id', user.id)

  if (fetchError) {
    console.error('Error fetching webhooks:', fetchError.message)
    process.exit(1)
  }

  console.log(`Found ${webhooks?.length || 0} webhook(s)`)

  // The correct webhook configuration matching the original Streamlit app
  const correctConfig = {
    name: 'Appendment Blog',
    description: 'Publish generated content to appendment.com blog',
    endpoint_url: 'https://appendment.com/.netlify/functions/blog-webhook',
    http_method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    auth_type: 'none', // Secret is in the body, not header
    auth_config: {},
    payload_template: {
      secret: BLOG_ADMIN_SECRET,
      post: {
        title: '',
        content: '',
        excerpt: '',
        category: '',
        tags: '',
        seoKeywords: ''
      }
    },
    field_mappings: {
      'post.title': 'title',
      'post.content': 'content',
      'post.excerpt': 'excerpt',
      'post.category': 'category',
      'post.tags': 'tags',
      'post.seoKeywords': 'seoKeywords'
    },
    enabled: true,
    retry_count: 3,
    timeout_ms: 30000
  }

  if (webhooks && webhooks.length > 0) {
    // Update existing webhook
    const webhookId = webhooks[0].id
    console.log('Updating existing webhook:', webhookId)

    const { error: updateError } = await supabase
      .from('webhook_configs')
      .update(correctConfig)
      .eq('id', webhookId)

    if (updateError) {
      console.error('Error updating webhook:', updateError.message)
      process.exit(1)
    }

    console.log('Webhook updated successfully!')
  } else {
    // Create new webhook
    console.log('Creating new webhook...')

    const { error: createError } = await supabase
      .from('webhook_configs')
      .insert({
        user_id: user.id,
        ...correctConfig
      })

    if (createError) {
      console.error('Error creating webhook:', createError.message)
      process.exit(1)
    }

    console.log('Webhook created successfully!')
  }

  // Verify the configuration
  const { data: verifyWebhook } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('user_id', user.id)
    .single()

  console.log('\n=== Updated Webhook Configuration ===')
  console.log('Name:', verifyWebhook?.name)
  console.log('URL:', verifyWebhook?.endpoint_url)
  console.log('Method:', verifyWebhook?.http_method)
  console.log('Auth Type:', verifyWebhook?.auth_type)
  console.log('Retry Count:', verifyWebhook?.retry_count)
  console.log('Timeout:', verifyWebhook?.timeout_ms, 'ms')
  console.log('\nPayload Template:', JSON.stringify(verifyWebhook?.payload_template, null, 2))
  console.log('\nField Mappings:', JSON.stringify(verifyWebhook?.field_mappings, null, 2))

  // Also show project/transcript stats
  console.log('\n=== Project & Transcript Stats ===')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', user.id)

  console.log(`\nProjects (${projects?.length || 0}):`)
  for (const project of projects || []) {
    const { count } = await supabase
      .from('transcripts')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id)

    console.log(`  - ${project.name}: ${count} transcripts`)
  }

  // Check for unassigned transcripts
  const { count: unassignedCount } = await supabase
    .from('transcripts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('project_id', null)

  console.log(`\nUnassigned transcripts: ${unassignedCount}`)
}

main().catch(console.error)
