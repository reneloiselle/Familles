import { NextRequest, NextResponse } from 'next/server'
import nodeIcal from 'node-ical'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
    try {
        // Initialize Supabase client with service role key for backend operations
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables:', {
                hasUrl: !!supabaseUrl,
                hasServiceKey: !!supabaseServiceKey,
            })
            return NextResponse.json(
                { error: 'Server configuration error: Missing Supabase credentials' },
                { status: 500 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
        console.log('=== CALENDAR SYNC START ===')
        console.log(`Subscription ID: ${subscription_id}`)
        console.log(`Subscription URL: ${subscription.url}`)
        console.log(`Family Member ID: ${subscription.family_member_id}`)
        
        const events = await nodeIcal.async.fromURL(subscription.url)
        const syncTime = new Date().toISOString()
        const validExternalUids: string[] = []

        console.log(`Total events parsed: ${Object.keys(events).length}`)
        console.log(`Sync time: ${syncTime}`)

        // 3. Process events
        let processedCount = 0
        let skippedCount = 0
        
        for (const event of Object.values(events)) {
            if (event.type === 'VEVENT') {
                const title = event.summary || 'Événement sans titre'
                const description = event.description || ''
                const location = event.location || ''
                const uid = event.uid

                console.log(`\n--- Processing Event ${processedCount + skippedCount + 1} ---`)
                console.log(`UID: ${uid}`)
                console.log(`Title: ${title}`)
                console.log(`Description: ${description || '(none)'}`)
                console.log(`Location: ${location || '(none)'}`)
                console.log(`Event type: ${event.type}`)
                console.log(`Event start (raw): ${event.start}`)
                console.log(`Event end (raw): ${event.end || '(none)'}`)
                console.log(`Event duration: ${event.duration || '(none)'}`)

                if (!event.start) {
                    console.log('SKIPPED: No start date')
                    skippedCount++
                    continue
                }

                const startDate = new Date(event.start)
                const endDate = event.end ? new Date(event.end) : new Date(startDate.getTime() + 3600000) // Default 1 hour
                const dateStr = startDate.toISOString().split('T')[0]

                console.log(`Start date (parsed): ${startDate.toISOString()}`)
                console.log(`End date (parsed): ${endDate.toISOString()}`)
                console.log(`Date string: ${dateStr}`)
                console.log(`Start date - Local: ${startDate.toString()}`)
                console.log(`End date - Local: ${endDate.toString()}`)
                console.log(`Start date - UTC: ${startDate.toUTCString()}`)
                console.log(`End date - UTC: ${endDate.toUTCString()}`)

                // Format times as HH:mm
                // Extract hours and minutes from the date objects using local time
                // This preserves the time as it appears in the source calendar
                const formatTime = (date: Date): string => {
                    const hours = date.getHours().toString().padStart(2, '0')
                    const minutes = date.getMinutes().toString().padStart(2, '0')
                    return `${hours}:${minutes}`
                }

                let startTimeStr = formatTime(startDate)
                let endTimeStr = formatTime(endDate)
                
                console.log(`Formatted start time: ${startTimeStr}`)
                console.log(`Formatted end time (before check): ${endTimeStr}`)
                
                // Si l'heure de début et de fin sont identiques, ajouter 1 heure à la fin
                if (startTimeStr === endTimeStr) {
                    console.log(`WARNING: Start and end times are identical, adding 1 hour to end time`)
                    const newEndDate = new Date(endDate.getTime() + 3600000) // Ajouter 1 heure (3600000 ms)
                    endTimeStr = formatTime(newEndDate)
                    console.log(`New end time: ${endTimeStr}`)
                    console.log(`New end date: ${newEndDate.toISOString()}`)
                }
                
                console.log(`Final start time: ${startTimeStr}`)
                console.log(`Final end time: ${endTimeStr}`)
                console.log(`Date: ${dateStr}`)
                
                // Log timezone info
                console.log(`Timezone offset: ${startDate.getTimezoneOffset()} minutes`)
                console.log(`Start date getHours(): ${startDate.getHours()}, getUTCHours(): ${startDate.getUTCHours()}`)
                console.log(`End date getHours(): ${endDate.getHours()}, getUTCHours(): ${endDate.getUTCHours()}`)

                validExternalUids.push(uid)

                const scheduleData = {
                    family_member_id: subscription.family_member_id,
                    subscription_id: subscription.id,
                    external_uid: uid,
                    title: title,
                    description: description || null,
                    location: location || null,
                    start_time: startTimeStr,
                    end_time: endTimeStr,
                    date: dateStr,
                    created_by: createdBy,
                    last_synced_at: syncTime
                }
                
                console.log('Schedule data to upsert:', JSON.stringify(scheduleData, null, 2))

                // Upsert into schedules
                const { error: upsertError, data: upsertData } = await supabase
                    .from('schedules')
                    .upsert(scheduleData, {
                        onConflict: 'subscription_id,external_uid'
                    })
                    .select()

                if (upsertError) {
                    console.error('ERROR upserting event:', upsertError)
                    console.error('Failed schedule data:', scheduleData)
                } else {
                    console.log('SUCCESS: Event upserted')
                    if (upsertData && upsertData.length > 0) {
                        console.log('Upserted schedule:', JSON.stringify(upsertData[0], null, 2))
                    }
                    processedCount++
                }
            }
        }

        console.log(`\n=== SYNC SUMMARY ===`)
        console.log(`Total events in feed: ${Object.keys(events).length}`)
        console.log(`Processed successfully: ${processedCount}`)
        console.log(`Skipped: ${skippedCount}`)
        console.log(`Valid external UIDs: ${validExternalUids.length}`)

        // 4. Delete events that are no longer in the feed
        if (validExternalUids.length > 0) {
            console.log(`Deleting schedules not in feed...`)
            const { error: deleteError, count: deleteCount } = await supabase
                .from('schedules')
                .delete()
                .eq('subscription_id', subscription_id)
                .not('external_uid', 'in', `(${validExternalUids.map(id => `"${id}"`).join(',')})`)
            
            if (deleteError) {
                console.error('ERROR deleting old schedules:', deleteError)
            } else {
                console.log(`Deleted ${deleteCount || 0} old schedules`)
            }
        } else {
            console.log('No valid UIDs found, skipping deletion of old schedules')
        }

        // 5. Update last_synced_at
        console.log('Updating last_synced_at...')
        const { error: updateError } = await supabase
            .from('calendar_subscriptions')
            .update({ last_synced_at: syncTime })
            .eq('id', subscription_id)

        if (updateError) {
            console.error('ERROR updating last_synced_at:', updateError)
        } else {
            console.log('Successfully updated last_synced_at')
        }

        console.log('=== CALENDAR SYNC END ===\n')

        return NextResponse.json({ 
            success: true, 
            count: validExternalUids.length,
            processed: processedCount,
            skipped: skippedCount
        })
    } catch (error: any) {
        console.error('Error syncing calendar:', error)
        return NextResponse.json({ error: error.message || 'Failed to sync calendar' }, { status: 500 })
    }
}
