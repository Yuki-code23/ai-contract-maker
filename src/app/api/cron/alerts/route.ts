import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { Contract } from '@/lib/db';

// This endpoint matches the path: /api/cron/alerts
// Usage: Trigger manually or via Vercel Cron
export async function GET(request: Request) {
    try {
        console.log('Running daily contract alert check...');

        // 1. Fetch all active contracts
        const { data: contracts, error } = await supabaseServer
            .from('contracts')
            .select('*')
            .or('status.eq.締結済み,status.eq.Active');

        if (error) {
            console.error('Failed to fetch contracts for alerts:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!contracts || contracts.length === 0) {
            return NextResponse.json({ message: 'No active contracts found', count: 0 });
        }

        const alertsGenerated = [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // 2. Iterate and check dates
        for (const contract of contracts) {
            // Check End Date
            let endDateStr = contract.deadline;

            // If not in standard deadline column, check metadata
            if (!endDateStr && contract.metadata?.end_date) {
                endDateStr = contract.metadata.end_date;
            }

            if (!endDateStr) continue;

            const endDate = new Date(endDateStr);
            const noticeDays = contract.metadata?.notice_period_days || 30; // Default 30 days notice
            const noticeDate = new Date(endDate);
            noticeDate.setDate(noticeDate.getDate() - noticeDays);

            // Check if today matches notice date
            // Note: simple string comparison for day precision
            const noticeDateStr = noticeDate.toISOString().split('T')[0];

            // Logic: Alert if today is exactly the notice date, or if it's past notice date but before end date (and maybe not alerted yet - skip state tracking for simplicity in MVP)
            // For MVP: We will output a log. In production, we'd insert into a "notifications" table or send email.

            const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilEnd <= noticeDays && daysUntilEnd > 0) {
                // Determine if we should alert "today"
                // For MVP, we'll just log/return it as an active alert
                alertsGenerated.push({
                    contractId: contract.id,
                    partyB: contract.party_b,
                    endDate: endDateStr,
                    daysRemaining: daysUntilEnd,
                    action: 'Renew or Terminate'
                });

                console.log(`[ALERT] Contract #${contract.id} (${contract.party_b}) expires in ${daysUntilEnd} days (Deadline: ${endDateStr}). Notice period: ${noticeDays} days.`);
            }
        }

        // 3. (Optional) Create notifications in DB (skipping for this MVP step, just returning JSON)

        return NextResponse.json({
            success: true,
            checkedCount: contracts.length,
            alerts: alertsGenerated
        });

    } catch (error: any) {
        console.error('Error in alert cron:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
