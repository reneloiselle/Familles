import { NextRequest, NextResponse } from 'next/server'
import nodeIcal from 'node-ical'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: NextRequest) {
    try {
        const { subscription_id } = await req.json()

        if (!subscription_id) {
            return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
        }

        // 1. Get subscription details
        const { data: subscription, error: subError } = await supabase
            .from('calendar_subscriptions')
            .select('*')
            .eq('id', subscription_id)
            .single()

        if (subError) {
            console.error('Subscription query error:', subError)
            return NextResponse.json({ error: `Database error: ${subError.message}` }, { status: 500 })
        }

        if (!subscription) {
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
        }

        // 2. Get family member details
        const { data: familyMember, error: memberError } = await supabase
            .from('family_members')
            .select('family_id, user_id')
            .eq('id', subscription.family_member_id)
            .single()

        if (memberError || !familyMember) {
            console.error('Family member query error:', memberError)
            return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
        }

        const familyId = familyMember.family_id
        const createdBy = familyMember.user_id || null

        // 2. Fetch and parse iCal
        const events = await nodeIcal.async.fromURL(subscription.url)
        const syncTime = new Date().toISOString()
        const validExternalUids: string[] = []

        // 3. Process events
        for (const event of Object.values(events)) {
            if (event.type === 'VEVENT') {
                const title = event.summary || 'Événement sans titre'
                const description = event.description || ''
                const location = event.location || ''
                const uid = event.uid

                if (!event.start) continue

                const startDate = new Date(event.start)
                const endDate = event.end ? new Date(event.end) : new Date(startDate.getTime() + 3600000) // Default 1 hour
                const dateStr = startDate.toISOString().split('T')[0]

                // Format times as HH:mm
                const startTimeStr = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                const endTimeStr = endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

                validExternalUids.push(uid)

                // Upsert into schedules
                const { error: upsertError } = await supabase
                    .from('schedules')
                    .upsert({
                        family_member_id: subscription.family_member_id,
                        subscription_id: subscription.id,
                        external_uid: uid,
                        title: title,
                        description: description,
                        start_time: startTimeStr,
                        end_time: endTimeStr,
                        date: dateStr,
                        created_by: createdBy,
                        last_synced_at: syncTime
                    }, {
                        onConflict: 'subscription_id,external_uid'
                    })

                if (upsertError) {
                    console.error('Error upserting event:', upsertError)
                }
            }
        }

        // 4. Delete events that are no longer in the feed
        if (validExternalUids.length > 0) {
            await supabase
                .from('schedules')
                .delete()
                .eq('subscription_id', subscription_id)
                .not('external_uid', 'in', `(${validExternalUids.map(id => `"${id}"`).join(',')})`)
        } else {
            // If no events found in feed, delete all for this subscription? 
            // Or maybe the feed failed to parse. Let's be safe and only delete if we processed some events.
            // Actually, if the feed is empty, we should probably delete everything.
            // But for safety, let's only delete if we successfully parsed the feed object.
        }

        // 5. Update last_synced_at
        await supabase
            .from('calendar_subscriptions')
            .update({ last_synced_at: syncTime })
            .eq('id', subscription_id)

        return NextResponse.json({ success: true, count: validExternalUids.length })
    } catch (error: any) {
        console.error('Error syncing calendar:', error)
        return NextResponse.json({ error: error.message || 'Failed to sync calendar' }, { status: 500 })
    }
}
