'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Calendar as CalendarIcon, Clock, Settings, MapPin, Map, X, Edit2, Trash2, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import { CalendarSubscriptionManager } from './CalendarSubscriptionManager'
import { LocationPicker } from './LocationPicker'
import { LocationViewer } from './LocationViewer'

// Helper function pour obtenir la date locale au format YYYY-MM-DD sans problème de fuseau horaire
function getLocalDateString(date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function pour créer une date locale à partir d'une chaîne YYYY-MM-DD
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

interface Schedule {
  id: string
  family_member_id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  date: string
  family_members?: {
    id: string
    user_id: string | null
    role: string
    avatar_url?: string | null
  }
  subscription_id?: string | null
  external_uid?: string | null
}

interface FamilyMember {
  id: string
  user_id: string | null
  role: 'parent' | 'child'
  email?: string | null
  name?: string | null
  avatar_url?: string | null
}

interface ScheduleManagementProps {
  user: User
  familyMember: any
  familyMembers: FamilyMember[]
  schedules: Schedule[]
  initialDate: string
  initialView: string
}

interface Subscription {
  id: string
  family_member_id: string
  url: string
  name: string
  color: string | null
}

export function ScheduleManagement({
  user,
  familyMember,
  familyMembers,
  schedules,
  initialDate,
  initialView,
}: ScheduleManagementProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [showSubscriptions, setShowSubscriptions] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showEditLocationPicker, setShowEditLocationPicker] = useState(false)
  const [viewingLocation, setViewingLocation] = useState<string | null>(null)
  const [viewingLocationScheduleId, setViewingLocationScheduleId] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [view, setView] = useState(initialView)
  const [localSchedules, setLocalSchedules] = useState<Schedule[]>(schedules)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: getLocalDateString(),
    start_time: '09:00',
    end_time: '10:00',
    family_member_id: familyMember.id,
  })
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    start_time: '',
    end_time: '',
    family_member_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Empêcher le scroll du body quand une modale est ouverte
  useEffect(() => {
    if (showForm || editingScheduleId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showForm, editingScheduleId])

  // Synchroniser les horaires initiaux
  useEffect(() => {
    setLocalSchedules(schedules)
  }, [schedules])

  useEffect(() => {
    loadSubscriptions()
  }, [familyMembers])

  const getWeekStart = (dateStr: string) => {
    const date = parseLocalDate(dateStr)
    const day = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
    return getLocalDateString(monday)
  }

  // Recharger les horaires quand la date ou la vue change
  useEffect(() => {
    const loadSchedules = async () => {
      const familyMemberIds = familyMembers.map(m => m.id)
      
      if (familyMemberIds.length === 0) {
        setLocalSchedules([])
        return
      }

      let query = supabase
        .from('schedules')
        .select('*, family_members(id, user_id, role, email, name, avatar_url)')
        .in('family_member_id', familyMemberIds)

      if (view === 'family') {
        // Pour la vue family, afficher les 7 prochains jours à partir d'aujourd'hui
        const today = getLocalDateString()
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() + 7)
        const endDateStr = getLocalDateString(endDate)
        query = query.gte('date', today).lte('date', endDateStr)
      } else if (view === 'week') {
        const weekStart = getWeekStart(selectedDate)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        query = query.gte('date', weekStart).lte('date', getLocalDateString(weekEnd))
      }
      // Pour 'personal', on filtre côté client

      const { data, error } = await query
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading schedules:', error)
        return
      }

      setLocalSchedules(data || [])
    }

    loadSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, view])

  const loadSubscriptions = async () => {
    const { data: subs } = await supabase
      .from('calendar_subscriptions')
      .select('*')
      .in('family_member_id', familyMembers.map(m => m.id))

    if (subs) {
      setSubscriptions(subs)
    }
  }

  const getSubscriptionColor = (subId: string | null | undefined) => {
    if (!subId) return null
    const sub = subscriptions.find(s => s.id === subId)
    return sub?.color || '#3B82F6'
  }

  const isParent = familyMember.role === 'parent'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('schedules')
        .insert({
          family_member_id: formData.family_member_id,
          title: formData.title,
          description: formData.description || null,
          location: formData.location || null,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
        })

      if (error) throw error

      // Recharger les horaires localement selon la vue actuelle
      const familyMemberIds = familyMembers.map(m => m.id)
      let reloadQuery = supabase
        .from('schedules')
        .select('*, family_members(id, user_id, role, email, name, avatar_url)')
        .in('family_member_id', familyMemberIds)

      if (view === 'family') {
        // Pour la vue family, afficher les 7 prochains jours à partir d'aujourd'hui
        const today = getLocalDateString()
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() + 7)
        const endDateStr = getLocalDateString(endDate)
        reloadQuery = reloadQuery.gte('date', today).lte('date', endDateStr)
      } else if (view === 'week') {
        const weekStart = getWeekStart(selectedDate)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        reloadQuery = reloadQuery.gte('date', weekStart).lte('date', getLocalDateString(weekEnd))
      }
      // Pour 'personal', on recharge tout et on filtre côté client

      const { data: updatedSchedules } = await reloadQuery
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (updatedSchedules) {
        setLocalSchedules(updatedSchedules)
      }

      setShowForm(false)
      setShowLocationPicker(false)
      setFormData({
        title: '',
        description: '',
        location: '',
        date: getLocalDateString(),
        start_time: '09:00',
        end_time: '10:00',
        family_member_id: familyMember.id,
      })
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de l\'horaire')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (schedule: Schedule) => {
    setEditingScheduleId(schedule.id)
    setEditFormData({
      title: schedule.title,
      description: schedule.description || '',
      location: schedule.location || '',
      date: schedule.date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      family_member_id: schedule.family_member_id,
    })
  }

  const cancelEditing = () => {
    setEditingScheduleId(null)
    setEditFormData({
      title: '',
      description: '',
      location: '',
      date: '',
      start_time: '',
      end_time: '',
      family_member_id: '',
    })
    setShowEditLocationPicker(false)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingScheduleId) return

    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('schedules')
        .update({
          title: editFormData.title,
          description: editFormData.description || null,
          location: editFormData.location || null,
          date: editFormData.date,
          start_time: editFormData.start_time,
          end_time: editFormData.end_time,
          family_member_id: editFormData.family_member_id,
        })
        .eq('id', editingScheduleId)

      if (error) throw error

      // Recharger les horaires localement selon la vue actuelle
      const familyMemberIds = familyMembers.map(m => m.id)
      let reloadQuery = supabase
        .from('schedules')
        .select('*, family_members(id, user_id, role, email, name, avatar_url)')
        .in('family_member_id', familyMemberIds)

      if (view === 'family') {
        const today = getLocalDateString()
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() + 7)
        const endDateStr = getLocalDateString(endDate)
        reloadQuery = reloadQuery.gte('date', today).lte('date', endDateStr)
      } else if (view === 'week') {
        const weekStart = getWeekStart(selectedDate)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        reloadQuery = reloadQuery.gte('date', weekStart).lte('date', getLocalDateString(weekEnd))
      }

      const { data: updatedSchedules } = await reloadQuery
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (updatedSchedules) {
        setLocalSchedules(updatedSchedules)
      }

      cancelEditing()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification de l\'horaire')
    } finally {
      setLoading(false)
    }
  }

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet horaire ?')) {
      return
    }

    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId)

      if (error) throw error

      // Retirer immédiatement de la liste locale
      setLocalSchedules((prev) => prev.filter((s) => s.id !== scheduleId))
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression')
      // En cas d'erreur, recharger depuis le serveur
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  // Calculate week days (Monday to Sunday)
  const getWeekDays = (dateStr: string) => {
    const date = parseLocalDate(dateStr)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday (0)
    const monday = new Date(date)
    monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1))

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(getLocalDateString(d))
    }
    return days
  }

  const weekDays = view === 'week' ? getWeekDays(selectedDate) : []

  const filteredSchedules = view === 'personal'
    ? localSchedules.filter(s => s.family_members?.user_id === user.id)
    : localSchedules

  const groupedSchedules = filteredSchedules.reduce((acc: any, schedule) => {
    const key = schedule.date
    if (!acc[key]) acc[key] = []
    acc[key].push(schedule)
    return acc
  }, {})

  const getMemberName = (memberId: string) => {
    const member = familyMembers.find(m => m.id === memberId)
    if (!member) return 'Membre inconnu'
    if (member.user_id === user.id) return 'Vous'
    if (member.name) return member.name
    if (member.email) return member.email
    return `Membre ${member.id.slice(0, 8)}`
  }

  const getMemberAvatar = (memberId: string) => {
    const member = familyMembers.find(m => m.id === memberId)
    return member?.avatar_url || '👤'
  }

  // Fonction pour vérifier si deux horaires se chevauchent
  const schedulesOverlap = (schedule1: Schedule, schedule2: Schedule): boolean => {
    if (schedule1.date !== schedule2.date) return false
    
    // Convertir les heures en minutes pour faciliter la comparaison
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    const start1 = timeToMinutes(schedule1.start_time)
    const end1 = timeToMinutes(schedule1.end_time)
    const start2 = timeToMinutes(schedule2.start_time)
    const end2 = timeToMinutes(schedule2.end_time)
    
    // Deux horaires se chevauchent si l'un commence avant que l'autre se termine
    // et se termine après que l'autre commence
    return start1 < end2 && end1 > start2
  }

  // Fonction pour obtenir les IDs des horaires qui se chevauchent avec un horaire donné
  const getOverlappingScheduleIds = (schedule: Schedule, allSchedules: Schedule[]): string[] => {
    return allSchedules
      .filter(s => s.id !== schedule.id && schedulesOverlap(schedule, s))
      .map(s => s.id)
  }

  // Fonction pour vérifier si deux horaires sont back-to-back (moins de 30 minutes entre eux)
  const schedulesAreBackToBack = (schedule1: Schedule, schedule2: Schedule): boolean => {
    // Doit être le même membre et la même date
    if (schedule1.family_member_id !== schedule2.family_member_id || schedule1.date !== schedule2.date) {
      return false
    }

    // Convertir les heures en minutes pour faciliter la comparaison
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    const end1 = timeToMinutes(schedule1.end_time)
    const start2 = timeToMinutes(schedule2.start_time)
    const end2 = timeToMinutes(schedule2.end_time)
    const start1 = timeToMinutes(schedule1.start_time)

    // Vérifier si schedule2 commence moins de 30 minutes après la fin de schedule1
    const gapAfter1 = start2 - end1
    // Vérifier si schedule1 commence moins de 30 minutes après la fin de schedule2
    const gapAfter2 = start1 - end2

    // Back-to-back si l'écart est entre 0 et 30 minutes (inclus)
    return (gapAfter1 >= 0 && gapAfter1 <= 30) || (gapAfter2 >= 0 && gapAfter2 <= 30)
  }

  // Fonction pour obtenir les IDs des horaires back-to-back avec un horaire donné
  const getBackToBackScheduleIds = (schedule: Schedule, allSchedules: Schedule[]): string[] => {
    return allSchedules
      .filter(s => s.id !== schedule.id && schedulesAreBackToBack(schedule, s))
      .map(s => s.id)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
        {isParent && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                setView('personal')
                router.push(`/dashboard/schedule?view=personal`)
              }}
              className={`btn btn-sm ${view === 'personal' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm`}
            >
              <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Mon agenda</span>
              <span className="sm:hidden">Moi</span>
            </button>
            <button
              onClick={() => {
                setView('family')
                router.push(`/dashboard/schedule?view=family&date=${selectedDate}`)
              }}
              className={`btn btn-sm ${view === 'family' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm`}
            >
              <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Vue famille</span>
              <span className="sm:hidden">Famille</span>
            </button>
            <button
              onClick={() => {
                setView('week')
                router.push(`/dashboard/schedule?view=week&date=${selectedDate}`)
              }}
              className={`btn btn-sm ${view === 'week' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm`}
            >
              <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Vue semaine</span>
              <span className="sm:hidden">Semaine</span>
            </button>
          </div>
        )}

        <div className="flex gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-sm btn-primary flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Ajouter horaire</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
          <button
            onClick={() => setShowSubscriptions(!showSubscriptions)}
            className="btn btn-sm btn-secondary flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5"
            title="Gérer les calendriers externes"
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline ml-1.5">Calendriers</span>
          </button>
        </div>
      </div>

      {showSubscriptions && (
        <div className="card border-blue-100 bg-blue-50">
          <h2 className="text-lg font-semibold mb-4">Abonnements Calendriers (iCal)</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {familyMembers.map(member => (
              <div key={member.id}>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span className="text-xl">{member.avatar_url || '👤'}</span>
                  {member.name || member.email || 'Membre'}
                </h4>
                <CalendarSubscriptionManager
                  familyMemberId={member.id}
                  onSubscriptionsChange={() => {
                    loadSubscriptions()
                    router.refresh()
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className="card">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Semaine à visualiser
          </label>
          <div className="flex items-center gap-4">
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                router.push(`/dashboard/schedule?view=${view}&date=${e.target.value}`)
              }}
              className="input"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const newDate = parseLocalDate(selectedDate)
                  newDate.setDate(newDate.getDate() - 7)
                  const newDateStr = getLocalDateString(newDate)
                  setSelectedDate(newDateStr)
                  router.push(`/dashboard/schedule?view=week&date=${newDateStr}`)
                }}
                className="btn btn-secondary"
              >
                ← Semaine précédente
              </button>
              <button
                onClick={() => {
                  const newDate = parseLocalDate(selectedDate)
                  newDate.setDate(newDate.getDate() + 7)
                  const newDateStr = getLocalDateString(newDate)
                  setSelectedDate(newDateStr)
                  router.push(`/dashboard/schedule?view=week&date=${newDateStr}`)
                }}
                className="btn btn-secondary"
              >
                Semaine suivante →
              </button>
              <button
                onClick={() => {
                  const today = getLocalDateString()
                  setSelectedDate(today)
                  router.push(`/dashboard/schedule?view=week&date=${today}`)
                }}
                className="btn btn-secondary"
              >
                Cette semaine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de création */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
            onClick={() => {
              setShowForm(false)
              setShowLocationPicker(false)
            }}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">Nouvel horaire</h2>
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setShowLocationPicker(false)
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
            {isParent && (
              <div>
                <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-1">
                  Membre
                </label>
                <select
                  id="member"
                  value={formData.family_member_id}
                  onChange={(e) => setFormData({ ...formData, family_member_id: e.target.value })}
                  className="input"
                >
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.user_id === user.id
                        ? 'Vous'
                        : member.name
                          ? member.name
                          : member.email
                            ? member.email
                            : `Membre ${member.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Titre
              </label>
                        <input
                          id="title"
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          className="input"
                          placeholder="École, Sport, etc."
                          autoFocus
                        />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optionnel)
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Localisation (optionnel)
              </label>
              <div className="flex gap-2">
                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input flex-1"
                  placeholder="Adresse, lieu, etc."
                />
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="btn btn-sm btn-secondary flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
                >
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{showLocationPicker ? 'Masquer' : 'Carte'}</span>
                </button>
              </div>
              {showLocationPicker && (
                <div className="mt-3 p-4 border border-gray-300 rounded-lg bg-white">
                  <LocationPicker
                    value={formData.location}
                    onChange={(address) => {
                      setFormData({ ...formData, location: address })
                    }}
                    onClose={() => setShowLocationPicker(false)}
                  />
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de début
                </label>
                <input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de fin
                </label>
                <input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  className="input"
                />
              </div>
            </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button type="submit" disabled={loading} className="btn btn-sm sm:btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm">
                      {loading ? 'Création...' : (
                        <>
                          <Plus className="w-4 h-4" />
                          Créer l'horaire
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        setShowLocationPicker(false)
                      }}
                      className="btn btn-sm btn-secondary px-4 py-2 text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modale d'édition */}
      {editingScheduleId && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
            onClick={cancelEditing}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">Modifier l'horaire</h2>
                  <button
                    onClick={cancelEditing}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Fermer"
                    disabled={loading}
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                {(() => {
                  const schedule = localSchedules.find(s => s.id === editingScheduleId)
                  if (!schedule) return null

                  return (
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                      {isParent && (
                        <div>
                          <label htmlFor="edit-member" className="block text-sm font-medium text-gray-700 mb-1">
                            Membre
                          </label>
                          <select
                            id="edit-member"
                            value={editFormData.family_member_id}
                            onChange={(e) => setEditFormData({ ...editFormData, family_member_id: e.target.value })}
                            className="input"
                          >
                            {familyMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.user_id === user.id
                                  ? 'Vous'
                                  : member.name
                                    ? member.name
                                    : member.email
                                      ? member.email
                                      : `Membre ${member.id.slice(0, 8)}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                          Titre
                        </label>
                        <input
                          id="edit-title"
                          type="text"
                          value={editFormData.title}
                          onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                          required
                          className="input"
                          placeholder="École, Sport, etc."
                          autoFocus
                        />
                      </div>

                      <div>
                        <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                          Description (optionnel)
                        </label>
                        <textarea
                          id="edit-description"
                          value={editFormData.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="input"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700 mb-1">
                          Localisation (optionnel)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="edit-location"
                            type="text"
                            value={editFormData.location}
                            onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                            className="input flex-1"
                            placeholder="Adresse, lieu, etc."
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditLocationPicker(!showEditLocationPicker)}
                            className="btn btn-sm btn-secondary flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
                          >
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">{showEditLocationPicker ? 'Masquer' : 'Carte'}</span>
                          </button>
                        </div>
                        {showEditLocationPicker && (
                          <div className="mt-3 p-4 border border-gray-300 rounded-lg bg-white">
                            <LocationPicker
                              value={editFormData.location}
                              onChange={(address) => {
                                setEditFormData({ ...editFormData, location: address })
                              }}
                              onClose={() => setShowEditLocationPicker(false)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700 mb-1">
                            Date
                          </label>
                          <input
                            id="edit-date"
                            type="date"
                            value={editFormData.date}
                            onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                            required
                            className="input"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-start_time" className="block text-sm font-medium text-gray-700 mb-1">
                            Heure de début
                          </label>
                          <input
                            id="edit-start_time"
                            type="time"
                            value={editFormData.start_time}
                            onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                            required
                            className="input"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-end_time" className="block text-sm font-medium text-gray-700 mb-1">
                            Heure de fin
                          </label>
                          <input
                            id="edit-end_time"
                            type="time"
                            value={editFormData.end_time}
                            onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                            required
                            className="input"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button type="submit" disabled={loading} className="btn btn-sm sm:btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm">
                          {loading ? 'Modification...' : (
                            <>
                              <Edit2 className="w-4 h-4" />
                              Enregistrer
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="btn btn-sm btn-secondary px-4 py-2 text-sm"
                          disabled={loading}
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  )
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'family' && (
        <div className="space-y-6">

          {filteredSchedules.length === 0 ? (
            <div className="card text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun horaire pour les 7 prochains jours</p>
            </div>
          ) : (
            Object.entries(groupedSchedules)
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([date, daySchedules]) => {
                const schedules = daySchedules as Schedule[]
                return (
                  <div key={date} className="card">
                    <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-200">
                      {parseLocalDate(date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <div className="space-y-3">
                      {schedules.map((schedule) => {
                        const isExternal = !!schedule.subscription_id
                        const color = isExternal ? getSubscriptionColor(schedule.subscription_id) : undefined
                        const overlappingIds = getOverlappingScheduleIds(schedule, schedules)
                        const hasOverlap = overlappingIds.length > 0
                        const backToBackIds = getBackToBackScheduleIds(schedule, schedules)
                      const hasBackToBack = backToBackIds.length > 0 && !hasOverlap

                      return (
                        <div
                          key={schedule.id}
                          className={`border-l-4 pl-4 py-3 rounded transition-all ${
                            hasOverlap 
                              ? 'bg-red-50 border-red-500 shadow-sm' 
                              : hasBackToBack
                                ? 'bg-yellow-50 border-yellow-400'
                                : isExternal 
                                  ? 'bg-gray-50' 
                                  : 'bg-gray-50 border-primary-500'
                          }`}
                          style={isExternal && !hasOverlap && !hasBackToBack ? { borderLeftColor: color || '#3B82F6' } : {}}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold flex items-center gap-2 flex-wrap">
                                {schedule.title}
                                {hasOverlap && (
                                  <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded font-medium" title="Conflit d'horaire">
                                    ⚠️ Conflit
                                  </span>
                                )}
                                {hasBackToBack && (
                                  <span className="text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded font-medium" title="Possibilité de problème de transport">
                                    🚗 Transport
                                  </span>
                                )}
                                {isExternal && !hasOverlap && !hasBackToBack && (
                                  <span className="text-xs bg-gray-200 text-gray-600 px-1 rounded">iCal</span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                                <span className="text-lg">{getMemberAvatar(schedule.family_member_id)}</span>
                                {getMemberName(schedule.family_member_id)}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {schedule.start_time} - {schedule.end_time}
                                </span>
                              </div>
                              {schedule.description && (
                                <p className="text-sm text-gray-600 mt-2">{schedule.description}</p>
                              )}
                              {schedule.location && (
                                <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{schedule.location}</span>
                                  {isExternal && (
                                    <button
                                      onClick={() => {
                                        setViewingLocation(schedule.location || '')
                                        setViewingLocationScheduleId(schedule.id)
                                      }}
                                      className="ml-2 text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-all hover:scale-110 active:scale-95"
                                      title="Voir sur la carte"
                                    >
                                      <Map className="w-5 h-5" strokeWidth={2} />
                                    </button>
                                  )}
                                </p>
                              )}
                            </div>
                            {(!isExternal && (isParent || schedule.family_members?.user_id === user.id)) && (
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                <button
                                  onClick={() => startEditing(schedule)}
                                  className="text-blue-600 hover:text-blue-800 p-1.5 sm:p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={() => deleteSchedule(schedule.id)}
                                  className="text-red-600 hover:text-red-800 p-1.5 sm:p-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  <span className="hidden sm:inline text-xs sm:text-sm">Supprimer</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                      })}
                    </div>
                  </div>
                )
              })
          )}
        </div>
      )}

      {view === 'personal' && (
        <div className="space-y-6">
          {Object.keys(groupedSchedules).length === 0 ? (
            <div className="card text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun horaire dans votre agenda</p>
            </div>
          ) : (
            Object.entries(groupedSchedules)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, schedules]: [string, any]) => (
                <div key={date} className="card">
                  <h2 className="text-xl font-semibold mb-4">
                    {new Date(date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h2>
                  <div className="space-y-3">
                    {schedules.map((schedule: Schedule) => {
                      const overlappingIds = getOverlappingScheduleIds(schedule, schedules)
                      const hasOverlap = overlappingIds.length > 0
                      const backToBackIds = getBackToBackScheduleIds(schedule, schedules)
                      const hasBackToBack = backToBackIds.length > 0 && !hasOverlap
                      
                      return (
                        <div
                          key={schedule.id}
                          className={`border-l-4 pl-4 py-3 rounded transition-all ${
                            hasOverlap 
                              ? 'bg-red-50 border-red-500 shadow-sm' 
                              : hasBackToBack
                                ? 'bg-yellow-50 border-yellow-400'
                                : 'bg-gray-50 border-primary-500'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold flex items-center gap-2 flex-wrap">
                                {schedule.title}
                                {hasOverlap && (
                                  <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded font-medium" title="Conflit d'horaire">
                                    ⚠️ Conflit
                                  </span>
                                )}
                                {hasBackToBack && (
                                  <span className="text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded font-medium" title="Possibilité de problème de transport">
                                    🚗 Transport
                                  </span>
                                )}
                              </h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {schedule.start_time} - {schedule.end_time}
                              </span>
                            </div>
                            {schedule.description && (
                              <p className="text-sm text-gray-600 mt-2">{schedule.description}</p>
                            )}
                            {schedule.location && (
                              <p className="text-sm text-gray-600 mt-2 flex items-center gap-1 flex-wrap">
                                <MapPin className="w-4 h-4" />
                                <span>{schedule.location}</span>
                                {schedule.subscription_id && (
                                  <button
                                    onClick={() => {
                                      setViewingLocation(schedule.location || '')
                                      setViewingLocationScheduleId(schedule.id)
                                    }}
                                    className="ml-2 text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-all hover:scale-110 active:scale-95"
                                    title="Voir sur la carte"
                                  >
                                    <Map className="w-5 h-5" strokeWidth={2} />
                                  </button>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() => startEditing(schedule)}
                              className="text-blue-600 hover:text-blue-800 p-1.5 sm:p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => deleteSchedule(schedule.id)}
                              className="text-red-600 hover:text-red-800 p-1.5 sm:p-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline text-xs sm:text-sm">Supprimer</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {view === 'week' && (
        <div className="card overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Vue semaine - {weekDays[0] && new Date(weekDays[0]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au {weekDays[6] && new Date(weekDays[6]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 p-3 text-left font-semibold sticky left-0 z-10 min-w-[150px]">
                    Membre
                  </th>
                  {weekDays.map((day, idx) => {
                    const date = parseLocalDate(day)
                    const isToday = day === getLocalDateString()
                    return (
                      <th
                        key={day}
                        className={`border border-gray-300 bg-gray-100 p-3 text-center font-semibold min-w-[120px] ${isToday ? 'bg-primary-100' : ''
                          }`}
                      >
                        <div className="font-bold">
                          {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                        </div>
                        <div className="text-sm font-normal">
                          {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {familyMembers.map((member) => {
                  const memberSchedules = filteredSchedules.filter(
                    (s) => s.family_member_id === member.id
                  )
                  const schedulesByDay = weekDays.reduce((acc: any, day) => {
                    acc[day] = memberSchedules.filter((s) => s.date === day)
                    return acc
                  }, {})

                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 bg-gray-50 p-3 sticky left-0 z-10 font-medium">
                        {member.user_id === user.id ? (
                          <span className="font-semibold">Vous</span>
                        ) : (
                          <span>
                            {member.name || member.email || `Membre ${member.id.slice(0, 8)}`}
                          </span>
                        )}
                        <span className="ml-2 text-xl">{member.avatar_url || '👤'}</span>
                        {member.role === 'parent' && (
                          <span className="ml-2 text-xs text-gray-500">(Parent)</span>
                        )}
                      </td>
                      {weekDays.map((day) => {
                        const daySchedules = schedulesByDay[day] || []
                        return (
                          <td
                            key={day}
                            className="border border-gray-300 p-2 align-top min-h-[100px]"
                          >
                            <div className="space-y-1">
                              {daySchedules.map((schedule: Schedule) => {
                                const isExternal = !!schedule.subscription_id
                                const color = isExternal ? getSubscriptionColor(schedule.subscription_id) : undefined
                                const overlappingIds = getOverlappingScheduleIds(schedule, daySchedules)
                                const hasOverlap = overlappingIds.length > 0
                                const backToBackIds = getBackToBackScheduleIds(schedule, daySchedules)
                                const hasBackToBack = backToBackIds.length > 0 && !hasOverlap

                                return (
                                  <div
                                    key={schedule.id}
                                    className={`rounded p-2 text-xs cursor-pointer transition-colors border-2 ${
                                      hasOverlap
                                        ? 'bg-red-500 text-white border-red-700 shadow-md'
                                        : hasBackToBack
                                          ? 'bg-yellow-500 text-white border-yellow-600'
                                          : isExternal
                                            ? 'text-white border-transparent'
                                            : 'bg-primary-500 text-white border-primary-700 hover:bg-primary-600'
                                    }`}
                                    style={isExternal && !hasOverlap && !hasBackToBack ? { backgroundColor: color || '#3B82F6' } : {}}
                                    title={`${schedule.title} - ${schedule.start_time} à ${schedule.end_time}${schedule.location ? ` - ${schedule.location}` : ''}${hasOverlap ? ' (Conflit d\'horaire)' : hasBackToBack ? ' (Possibilité de problème de transport)' : ''}`}
                                  >
                                    <div className="font-semibold truncate flex items-center gap-1">
                                      {hasOverlap && <span>⚠️</span>}
                                      {hasBackToBack && !hasOverlap && <span>🚗</span>}
                                      {schedule.title}
                                    </div>
                                    <div className="truncate">{schedule.start_time} - {schedule.end_time}</div>
                                    {schedule.location && (
                                      <div className="text-xs opacity-75 flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate">{schedule.location}</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {familyMembers.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Aucun membre dans la famille pour afficher les horaires
            </p>
          )}
        </div>
      )}

      {/* Popup pour afficher la localisation iCal */}
      {viewingLocation && (
        <LocationViewer
          address={viewingLocation}
          onClose={() => {
            setViewingLocation(null)
            setViewingLocationScheduleId(null)
          }}
          onSave={async (newAddress) => {
            if (!viewingLocationScheduleId) return

            setError('')
            setLoading(true)

            try {
              const { error } = await supabase
                .from('schedules')
                .update({ location: newAddress })
                .eq('id', viewingLocationScheduleId)

              if (error) throw error

              // Mettre à jour l'horaire localement
              setLocalSchedules((prev) =>
                prev.map((s) =>
                  s.id === viewingLocationScheduleId ? { ...s, location: newAddress } : s
                )
              )

              // Fermer le popup
              setViewingLocation(null)
              setViewingLocationScheduleId(null)
            } catch (err: any) {
              setError(err.message || 'Erreur lors de la mise à jour de la localisation')
            } finally {
              setLoading(false)
            }
          }}
          canSave={!!viewingLocationScheduleId}
        />
      )}
    </div>
  )
}

