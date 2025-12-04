'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Calendar, ExternalLink, RefreshCw } from 'lucide-react'

interface Subscription {
    id: string
    family_member_id: string
    url: string
    name: string
    color: string | null
    created_at: string
    last_synced_at: string | null
}

interface CalendarSubscriptionManagerProps {
    familyMemberId: string
    onSubscriptionsChange?: () => void
}

export function CalendarSubscriptionManager({ familyMemberId, onSubscriptionsChange }: CalendarSubscriptionManagerProps) {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        url: '',
        name: '',
        color: '#3B82F6',
    })
    const [loading, setLoading] = useState(false)
    const [syncingId, setSyncingId] = useState<string | null>(null)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        loadSubscriptions()
    }, [familyMemberId])

    const loadSubscriptions = async () => {
        const { data } = await supabase
            .from('calendar_subscriptions')
            .select('*')
            .eq('family_member_id', familyMemberId)
            .order('created_at', { ascending: false })

        if (data) {
            setSubscriptions(data)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Basic validation
            if (!formData.url.startsWith('http')) {
                throw new Error('L\'URL doit commencer par http:// ou https://')
            }

            const { error } = await supabase
                .from('calendar_subscriptions')
                .insert({
                    family_member_id: familyMemberId,
                    url: formData.url,
                    name: formData.name,
                    color: formData.color,
                })

            if (error) throw error

            setFormData({
                url: '',
                name: '',
                color: '#3B82F6',
            })
            setShowForm(false)
            await loadSubscriptions()
            if (onSubscriptionsChange) onSubscriptionsChange()
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Erreur lors de l\'ajout de l\'abonnement')
        } finally {
            setLoading(false)
        }
    }

    const deleteSubscription = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet abonnement ?')) {
            return
        }

        try {
            const { error } = await supabase
                .from('calendar_subscriptions')
                .delete()
                .eq('id', id)

            if (error) throw error

            await loadSubscriptions()
            if (onSubscriptionsChange) onSubscriptionsChange()
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la suppression')
        }
    }

    const syncSubscription = async (id: string) => {
        setSyncingId(id)
        try {
            const response = await fetch('/api/calendar/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription_id: id }),
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la synchronisation')
            }

            await loadSubscriptions()
            if (onSubscriptionsChange) onSubscriptionsChange()
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Erreur de synchronisation')
        } finally {
            setSyncingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Calendriers externes (iCal)
                </h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" />
                    Ajouter
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {error}
                </div>
            )}

            {showForm && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label htmlFor="calName" className="block text-xs font-medium text-gray-700 mb-1">
                                Nom du calendrier
                            </label>
                            <input
                                id="calName"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="input text-sm"
                                placeholder="Équipe de Hockey"
                            />
                        </div>
                        <div>
                            <label htmlFor="calUrl" className="block text-xs font-medium text-gray-700 mb-1">
                                URL iCal (.ics)
                            </label>
                            <input
                                id="calUrl"
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                required
                                className="input text-sm"
                                placeholder="https://example.com/calendar.ics"
                            />
                        </div>
                        <div>
                            <label htmlFor="calColor" className="block text-xs font-medium text-gray-700 mb-1">
                                Couleur
                            </label>
                            <input
                                id="calColor"
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="h-8 w-full cursor-pointer"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="btn btn-secondary text-xs"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary text-xs"
                            >
                                {loading ? 'Ajout...' : 'Ajouter'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-2">
                {subscriptions.length === 0 && !showForm && (
                    <p className="text-sm text-gray-500 italic">Aucun calendrier externe configuré.</p>
                )}
                {subscriptions.map((sub) => (
                    <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 border rounded bg-white"
                        style={{ borderLeftColor: sub.color || '#3B82F6', borderLeftWidth: '4px' }}
                    >
                        <div className="overflow-hidden flex-1">
                            <p className="font-medium text-sm truncate">{sub.name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <a
                                    href={sub.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-primary-600 truncate"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Lien
                                </a>
                                {sub.last_synced_at && (
                                    <span title={`Dernière synchro: ${new Date(sub.last_synced_at).toLocaleString()}`}>
                                        • {new Date(sub.last_synced_at).toLocaleDateString()} {new Date(sub.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => syncSubscription(sub.id)}
                                disabled={syncingId === sub.id}
                                className={`text-gray-400 hover:text-blue-600 p-1 ${syncingId === sub.id ? 'animate-spin text-blue-600' : ''}`}
                                title="Synchroniser maintenant"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => deleteSubscription(sub.id)}
                                className="text-gray-400 hover:text-red-600 p-1"
                                title="Supprimer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
