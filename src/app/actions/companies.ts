'use server'

import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { Company } from '@/lib/db'

export async function getCompanies() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return []
    }

    const { data, error } = await supabaseServer
        .from('companies')
        .select('*')
        .eq('user_email', session.user.email)
        .order('id', { ascending: true })

    if (error) {
        console.error('Error fetching companies:', error)
        return []
    }

    return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        postalCode: c.postal_code || '',
        address: c.address || '',
        building: c.building || null,
        presidentTitle: c.president_title || '',
        presidentName: c.president_name || '',
        contactPerson: c.contact_person || '',
        email: c.email || '',
        phone: c.phone || '',
        position: c.position || null,
        contractCount: 0 // This will need to be calculated separately or via join if needed
    }))
}

export async function getCompany(id: number) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseServer
        .from('companies')
        .select('*')
        .eq('id', id)
        .eq('user_email', session.user.email)
        .single()

    if (error) {
        console.error('Error fetching company:', error)
        throw new Error("Failed to fetch company")
    }

    return {
        id: data.id,
        name: data.name,
        postalCode: data.postal_code || '',
        address: data.address || '',
        building: data.building || null,
        presidentTitle: data.president_title || '',
        presidentName: data.president_name || '',
        contactPerson: data.contact_person || '',
        email: data.email || '',
        phone: data.phone || '',
        position: data.position || null,
        contractCount: 0
    }
}

export async function createCompany(company: Omit<Company, 'id' | 'user_email' | 'created_at' | 'updated_at'> | any) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const dbCompany = {
        user_email: session.user.email,
        name: company.name,
        postal_code: company.postalCode,
        address: company.address,
        building: company.building,
        president_title: company.presidentTitle,
        president_name: company.presidentName,
        contact_person: company.contactPerson,
        email: company.email,
        phone: company.phone,
        position: company.position
    }

    const { data, error } = await supabaseServer
        .from('companies')
        .insert(dbCompany)
        .select()
        .single()

    if (error) {
        console.error('Error creating company:', error)
        throw new Error("Failed to create company")
    }

    return data
}

export async function updateCompany(id: number, company: Partial<Company> | any) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const dbCompany: any = {
        updated_at: new Date().toISOString()
    }

    if (company.name !== undefined) dbCompany.name = company.name
    if (company.postalCode !== undefined) dbCompany.postal_code = company.postalCode
    if (company.address !== undefined) dbCompany.address = company.address
    if (company.building !== undefined) dbCompany.building = company.building
    if (company.presidentTitle !== undefined) dbCompany.president_title = company.presidentTitle
    if (company.presidentName !== undefined) dbCompany.president_name = company.presidentName
    if (company.contactPerson !== undefined) dbCompany.contact_person = company.contactPerson
    if (company.email !== undefined) dbCompany.email = company.email
    if (company.phone !== undefined) dbCompany.phone = company.phone
    if (company.position !== undefined) dbCompany.position = company.position

    const { error } = await supabaseServer
        .from('companies')
        .update(dbCompany)
        .eq('id', id)
        .eq('user_email', session.user.email)

    if (error) {
        console.error('Error updating company:', error)
        throw new Error("Failed to update company")
    }
}

export async function deleteCompany(id: number) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { error } = await supabaseServer
        .from('companies')
        .delete()
        .eq('id', id)
        .eq('user_email', session.user.email)

    if (error) {
        console.error('Error deleting company:', error)
        throw new Error("Failed to delete company")
    }
}

export async function deleteCompanies(ids: number[]) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    if (ids.length === 0) return;

    const { error } = await supabaseServer
        .from('companies')
        .delete()
        .in('id', ids)
        .eq('user_email', session.user.email)

    if (error) {
        console.error('Error deleting companies:', error)
        throw new Error("Failed to delete companies")
    }
}

export async function migrateCompanies(companies: any[]) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return
    }

    const userEmail = session.user.email

    // Check if we already have companies
    const { count } = await supabaseServer
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userEmail)

    if (count && count > 0) {
        return // Already migrated
    }

    const dbCompanies = companies.map(c => ({
        user_email: userEmail,
        name: c.name,
        postal_code: c.postalCode || '',
        address: c.address || '',
        building: c.building || null,
        president_title: c.presidentTitle || '',
        president_name: c.presidentName || '',
        contact_person: c.contactPerson || '',
        email: c.email || '',
        phone: c.phone || '',
        position: c.position || null
    }))

    if (dbCompanies.length === 0) return

    const { error } = await supabaseServer
        .from('companies')
        .insert(dbCompanies)

    if (error) {
        console.error('Error migrating companies:', error)
    }
}
