/**
 * Supabase helper functions with proper typing
 * These helpers work around type mismatches until types are regenerated
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get or create a project by name for a user
 */
export async function getOrCreateProject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  projectName: string
): Promise<string | null> {
  // First try to find existing project
  const { data: existingProject } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .eq('name', projectName)
    .single()

  if (existingProject?.id) {
    return existingProject.id
  }

  // Create new project
  const { data: newProject } = await supabase
    .from('projects')
    .insert({ user_id: userId, name: projectName })
    .select('id')
    .single()

  return newProject?.id || null
}
