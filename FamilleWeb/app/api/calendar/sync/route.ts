import { NextRequest, NextResponse } from 'next/server'
import nodeIcal from 'node-ical'

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json()

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        const events = await nodeIcal.async.fromURL(url)
        const scheduleEvents = []

        for (const event of Object.values(events)) {
            if (event.type === 'VEVENT') {
                scheduleEvents.push({
                    title: event.summary,
                    description: event.description,
                    start_time: event.start,
                    end_time: event.end,
                    location: event.location,
                    uid: event.uid,
                })
            }
        }

        return NextResponse.json({ events: scheduleEvents })
    } catch (error: any) {
        console.error('Error fetching iCal:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch calendar' }, { status: 500 })
    }
}
