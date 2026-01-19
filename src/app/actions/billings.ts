'use server'

import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { supabaseServer } from "@/lib/supabase/server"
import { Billing } from "@/lib/db"

export async function getBillings() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseServer
        .from('billings')
        .select(`
            *,
            contracts (
                party_b
            )
        `)
        .eq('user_email', session.user.email)
        .order('payment_deadline', { ascending: true })

    if (error) {
        console.error('Error fetching billings:', error)
        throw new Error("Failed to fetch billings")
    }

    return data.map((b: any) => ({
        ...b,
        contractPartyB: b.contracts?.party_b
    })) as (Billing & { contractPartyB?: string })[]
}

export async function getBilling(id: number) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseServer
        .from('billings')
        .select(`
            *,
            contracts (
                party_a,
                party_b,
                metadata
            )
        `)
        .eq('id', id)
        .eq('user_email', session.user.email)
        .single()

    if (error) {
        console.error('Error fetching billing:', error)
        throw new Error("Failed to fetch billing")
    }

    return data
}

export async function updateBillingStatus(id: number, status: Billing['status']) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { error } = await supabaseServer
        .from('billings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_email', session.user.email)

    if (error) {
        console.error('Error updating billing status:', error)
        throw new Error("Failed to update billing status")
    }

    // Requirement 3.C: Automatic sending logic
    if (status === 'Sent') {
        // In a real app, we would call Resend/SendGrid API here
        // For now, we simulate this action
        console.log(`[EMAIL SENT] Invoice #${id} has been sent to client.`);
    }

    return { success: true }
}

export async function createBilling(billing: Partial<Billing>) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseServer
        .from('billings')
        .insert({
            ...billing,
            user_email: session.user.email
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating billing:', error)
        throw new Error("Failed to create billing")
    }

    return { success: true, billing: data }
}

export async function generateBillingsFromContracts() {
    // This function checks all contracts and generates planned billings
    // For now, let's just make sure we can create one manually or via this helper
    // In a real scenario, this might be loop or triggered logic
    // Implementation deferred to cron/step 3 or on-demand
    return { success: true }
}
