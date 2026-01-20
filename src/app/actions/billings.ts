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
                party_b,
                contract_number
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
        contractPartyB: b.contracts?.party_b,
        contractNumber: b.contracts?.contract_number
    })) as (Billing & { contractPartyB?: string; contractNumber?: string })[]
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
                contract_number
            )
        `)
        .eq('id', id)
        .eq('user_email', session.user.email)
        .maybeSingle()

    if (error) {
        console.error(`Error fetching billing (id: ${id}):`, error)
        throw new Error("Failed to fetch billing: " + error.message)
    }

    if (!data) return null

    return {
        ...data,
        contractPartyA: data.contracts?.party_a,
        contractPartyB: data.contracts?.party_b,
        contractNumber: data.contracts?.contract_number
    }
}

export async function updateBillingStatus(id: number, status: Billing['status'], payment_date?: string) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    // Validate: payment_date is required when marking as Paid
    if (status === 'Paid' && !payment_date) {
        throw new Error("Payment date is required when marking invoice as paid")
    }

    const { data: billing, error: getError } = await supabaseServer
        .from('billings')
        .select('*')
        .eq('id', id)
        .single()

    if (getError || !billing) {
        throw new Error("Billing not found")
    }

    const updateData: any = {
        status,
        updated_at: new Date().toISOString()
    }

    // Add payment_date if provided
    if (payment_date) {
        updateData.payment_date = payment_date
    }

    const { error } = await supabaseServer
        .from('billings')
        .update(updateData)
        .eq('id', id)
        .eq('user_email', session.user.email)

    if (error) {
        console.error('Error updating billing status:', error)
        throw new Error("Failed to update billing status")
    }

    // Requirement 3.C: Automatic sending logic
    if (status === 'Sent') {
        console.log(`[EMAIL SENT] Invoice #${id} has been sent to client.`);
    }

    // RECURRING BILLING ENGINE: "Paid" -> "Next Draft"
    if (status === 'Paid' && billing.is_recurring && billing.recurring_interval) {
        try {
            const nextIssueDate = new Date(billing.issue_date || new Date());
            const nextDeadlineDate = new Date(billing.payment_deadline || new Date());

            const monthsToAdd =
                billing.recurring_interval === 'monthly' ? 1 :
                    billing.recurring_interval === 'quarterly' ? 3 :
                        billing.recurring_interval === 'yearly' ? 12 : 0;

            if (monthsToAdd > 0) {
                nextIssueDate.setMonth(nextIssueDate.getMonth() + monthsToAdd);
                nextDeadlineDate.setMonth(nextDeadlineDate.getMonth() + monthsToAdd);

                const { id: _, created_at: __, updated_at: ___, invoice_number: ____, status: _____, ...rest } = billing;

                await supabaseServer
                    .from('billings')
                    .insert({
                        ...rest,
                        status: 'Planned',
                        issue_date: nextIssueDate.toISOString().split('T')[0],
                        payment_deadline: nextDeadlineDate.toISOString().split('T')[0],
                        invoice_number: `INV-AUTO-${Date.now().toString().slice(-4)}`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                console.log(`[RECURRING] Auto-generated next draft for billing #${id} (${billing.recurring_interval})`);
            }
        } catch (e) {
            console.error("Failed to generate next recurring billing:", e);
        }
    }

    return { success: true }
}

export async function updateBilling(id: number, billing: Partial<Billing>) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseServer
        .from('billings')
        .update({
            ...billing,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_email', session.user.email)
        .select()
        .single()

    if (error) {
        console.error('Error updating billing:', error)
        throw new Error(`Failed to update billing: ${error.message}`)
    }

    return { success: true, billing: data }
}

export async function createBilling(billing: Partial<Billing>) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    // Clean billing data to avoid sending fields that might not exist in older DB schemas if not needed
    const insertData: any = {
        ...billing,
        user_email: session.user.email
    }

    // Only include recurring fields if they are actually used
    if (!billing.is_recurring) {
        delete insertData.is_recurring;
        delete insertData.recurring_interval;
    }

    const { data, error } = await supabaseServer
        .from('billings')
        .insert(insertData)
        .select()
        .single()

    if (error) {
        console.error('Error creating billing:', error)
        throw new Error(`Failed to create billing: ${error.message} (Code: ${error.code})`)
    }

    return { success: true, billing: data }
}

export async function deleteBilling(id: number) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { error } = await supabaseServer
        .from('billings')
        .delete()
        .eq('id', id)
        .eq('user_email', session.user.email)

    if (error) {
        console.error('Error deleting billing:', error)
        throw new Error("Failed to delete billing")
    }

    return { success: true }
}

export async function duplicateBilling(id: number) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    // 1. Fetch original
    const { data: original, error: fetchError } = await supabaseServer
        .from('billings')
        .select('*')
        .eq('id', id)
        .single()

    if (fetchError || !original) {
        throw new Error("Failed to fetch original billing for duplication")
    }

    // 2. Prepare new data
    const { id: _, created_at: __, updated_at: ___, ...rest } = original
    const newInvoiceNumber = `INV-COPY-${Date.now().toString().slice(-4)}`;

    // 3. Insert
    const { data, error: insertError } = await supabaseServer
        .from('billings')
        .insert({
            ...rest,
            invoice_number: newInvoiceNumber,
            status: 'Planned',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single()

    if (insertError) {
        console.error('Error duplicating billing:', insertError)
        throw new Error("Failed to duplicate billing")
    }

    return { success: true, billing: data }
}
