'use server'

import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { Template } from '@/lib/db'

export async function getTemplates() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return []
    }

    const { data, error } = await supabaseServer
        .from('templates')
        .select('*')
        .eq('user_email', session.user.email)
        .order('saved_at', { ascending: false })

    if (error) {
        console.error('Error fetching templates:', error)
        return []
    }

    return data.map((t: any) => ({
        id: t.id,
        name: t.name,
        partyA: t.party_a || '',
        partyB: t.party_b || '',
        addressA: t.address_a || '',
        addressB: t.address_b || '',
        presidentPositionA: t.president_position_a || '',
        presidentNameA: t.president_name_a || '',
        presidentPositionB: t.president_position_b || '',
        presidentNameB: t.president_name_b || '',
        content: t.content,
        savedAt: t.saved_at
    }))
}

export async function getTemplate(id: string) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseServer
        .from('templates')
        .select('*')
        .eq('id', id)
        .eq('user_email', session.user.email)
        .single()

    if (error) {
        console.error('Error fetching template:', error)
        throw new Error("Failed to fetch template")
    }

    return {
        id: data.id,
        name: data.name,
        partyA: data.party_a || '',
        partyB: data.party_b || '',
        addressA: data.address_a || '',
        addressB: data.address_b || '',
        presidentPositionA: data.president_position_a || '',
        presidentNameA: data.president_name_a || '',
        presidentPositionB: data.president_position_b || '',
        presidentNameB: data.president_name_b || '',
        content: data.content,
        savedAt: data.saved_at
    }
}

export async function createTemplate(template: any) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const dbTemplate = {
        user_email: session.user.email,
        name: template.name,
        party_a: template.partyA,
        party_b: template.partyB,
        address_a: template.addressA,
        address_b: template.addressB,
        president_position_a: template.presidentPositionA,
        president_name_a: template.presidentNameA,
        president_position_b: template.presidentPositionB,
        president_name_b: template.presidentNameB,
        content: template.content,
        saved_at: new Date().toISOString()
    }

    const { data, error } = await supabaseServer
        .from('templates')
        .insert(dbTemplate)
        .select()
        .single()

    if (error) {
        console.error('Error creating template:', error)
        throw new Error("Failed to create template")
    }

    return data
}

export async function updateTemplate(id: string, template: any) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const dbTemplate: any = {
        saved_at: new Date().toISOString()
    }

    if (template.name !== undefined) dbTemplate.name = template.name
    if (template.partyA !== undefined) dbTemplate.party_a = template.partyA
    if (template.partyB !== undefined) dbTemplate.party_b = template.partyB
    if (template.addressA !== undefined) dbTemplate.address_a = template.addressA
    if (template.addressB !== undefined) dbTemplate.address_b = template.addressB
    if (template.presidentPositionA !== undefined) dbTemplate.president_position_a = template.presidentPositionA
    if (template.presidentNameA !== undefined) dbTemplate.president_name_a = template.presidentNameA
    if (template.presidentPositionB !== undefined) dbTemplate.president_position_b = template.presidentPositionB
    if (template.presidentNameB !== undefined) dbTemplate.president_name_b = template.presidentNameB
    if (template.content !== undefined) dbTemplate.content = template.content

    const { error } = await supabaseServer
        .from('templates')
        .update(dbTemplate)
        .eq('id', id)
        .eq('user_email', session.user.email)

    if (error) {
        console.error('Error updating template:', error)
        throw new Error("Failed to update template")
    }
}

export async function deleteTemplate(id: string) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { error } = await supabaseServer
        .from('templates')
        .delete()
        .eq('id', id)
        .eq('user_email', session.user.email)

    if (error) {
        console.error('Error deleting template:', error)
        throw new Error("Failed to delete template")
    }
}

export async function migrateTemplates(templates: any[]) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return
    }

    const userEmail = session.user.email

    const { count } = await supabaseServer
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userEmail)

    if (count && count > 0) {
        return // Already migrated
    }

    const dbTemplates = templates.map(t => ({
        user_email: userEmail,
        name: t.name,
        party_a: t.partyA || '',
        party_b: t.partyB || '',
        address_a: t.addressA || '',
        address_b: t.addressB || '',
        president_position_a: t.presidentPositionA || '',
        president_name_a: t.presidentNameA || '',
        president_position_b: t.presidentPositionB || '',
        president_name_b: t.presidentNameB || '',
        content: t.content,
        saved_at: t.savedAt || new Date().toISOString()
    }))

    if (dbTemplates.length === 0) return

    const { error } = await supabaseServer
        .from('templates')
        .insert(dbTemplates)

    if (error) {
        console.error('Error migrating templates:', error)
    }
}
