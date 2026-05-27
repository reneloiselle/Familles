'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LocationPicker } from './LocationPicker'
import {
  getLocalDateString,
  getWeekDays,
  getWeekStart,
  getWeekEnd,
  addDays,
  parseLocalDate,
} from '@/lib/schedule/dateUtils'
import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  SLOT_HEIGHT_PX,
  GRID_HEIGHT_PX,
  formatTimeLabel,
  getEventTopPx,
  getEventHeightPx,
  computeDayEventLayouts,
} from '@/lib/schedule/scheduleLayout'
import { getMemberColor, getMemberDisplayName } from '@/lib/family/memberDisplay'
import { MemberAvatar } from './MemberAvatar'

interface Schedule {
  id: string
  family_member_id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  date: string
  subscription_id?: string | null
  family_members?: {
    id: string
    user_id: string | null
    role: string
    email?: string | null
    name?: string | null
    avatar_url?: string | null
    color?: string | null
  }
}

interface FamilyMember {
  id: string
  user_id: string | null
  role: 'parent' | 'child'
  email?: string | null
  name?: string | null
  avatar_url?: string | null
  color?: string | null
}

interface Subscription {
  id: string
  family_member_id: string
  color: string | null
}

interface FamilyPlanningWeekViewProps {
  user: User
  familyMember: { id: string; role: string }
  familyMembers: FamilyMember[]
  schedules: Schedule[]
  initialDate: string
}

type FormState = {
  title: string
  description: string
  location: string
  date: string
  start_time: string
  end_time: string
  family_member_id: string
}

const emptyForm = (memberId: string, date: string): FormState => ({
  title: '',
  description: '',
  location: '',
  date,
  start_time: '09:00',
  end_time: '10:00',
  family_member_id: memberId,
})

export function FamilyPlanningWeekView({
  user,
  familyMember,
  familyMembers,
  schedules,
  initialDate,
}: FamilyPlanningWeekViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const isParent = familyMember.role === 'parent'
  const memberIds = familyMembers.map((m) => m.id)

  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [localSchedules, setLocalSchedules] = useState<Schedule[]>(schedules)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [formData, setFormData] = useState<FormState>(
    emptyForm(familyMember.id, initialDate)
  )
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate])
  const today = getLocalDateString()

  useEffect(() => {
    setLocalSchedules(schedules)
    setSelectedDate(initialDate)
  }, [schedules, initialDate])

  useEffect(() => {
    const loadSubscriptions = async () => {
      const { data } = await supabase
        .from('calendar_subscriptions')
        .select('id, family_member_id, color')
        .in('family_member_id', memberIds)
      if (data) setSubscriptions(data)
    }
    loadSubscriptions()
  }, [familyMembers])

  useEffect(() => {
    if (showCreateModal || editingSchedule) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showCreateModal, editingSchedule])

  const navigateWeek = (offset: number) => {
    const newDate = addDays(weekStart, offset * 7)
    setSelectedDate(newDate)
    router.push(`/dashboard/planning?date=${newDate}`)
  }

  const goToToday = () => {
    const todayStr = getLocalDateString()
    setSelectedDate(todayStr)
    router.push(`/dashboard/planning?date=${todayStr}`)
  }

  const reloadWeekSchedules = useCallback(async () => {
    if (memberIds.length === 0) {
      setLocalSchedules([])
      return
    }
    const ws = getWeekStart(selectedDate)
    const we = getWeekEnd(ws)
    const { data } = await supabase
      .from('schedules')
      .select('*, family_members(id, user_id, role, email, name, avatar_url)')
      .in('family_member_id', memberIds)
      .gte('date', ws)
      .lte('date', we)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    if (data) setLocalSchedules(data)
  }, [memberIds, selectedDate, supabase])

  const getMemberLabel = (memberId: string) => {
    const member = familyMembers.find((m) => m.id === memberId)
    if (!member) return 'Membre inconnu'
    return getMemberDisplayName(member, user.id)
  }

  const getSubscriptionColor = (subId: string | null | undefined) => {
    if (!subId) return '#3B82F6'
    return subscriptions.find((s) => s.id === subId)?.color || '#3B82F6'
  }

  const canModify = (schedule: Schedule) => {
    if (schedule.subscription_id) return false
    if (isParent) return true
    return schedule.family_members?.user_id === user.id
  }

  const openCreate = (date: string, startTime?: string, memberId?: string) => {
    const targetMemberId = memberId ?? familyMember.id
    setFormData(emptyForm(targetMemberId, date))
    if (startTime) {
      const [h] = startTime.split(':').map(Number)
      const endH = Math.min(h + 1, DAY_END_HOUR)
      setFormData((prev) => ({
        ...prev,
        date,
        start_time: startTime,
        end_time: `${String(endH).padStart(2, '0')}:00`,
        family_member_id: targetMemberId,
      }))
    }
    setShowLocationPicker(false)
    setShowCreateModal(true)
    setEditingSchedule(null)
  }

  const openEdit = (schedule: Schedule) => {
    if (!canModify(schedule)) return
    setEditingSchedule(schedule)
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      location: schedule.location || '',
      date: schedule.date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      family_member_id: schedule.family_member_id,
    })
    setShowLocationPicker(false)
    setShowCreateModal(false)
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setEditingSchedule(null)
    setShowLocationPicker(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (editingSchedule) {
        const { error: updateError } = await supabase
          .from('schedules')
          .update({
            title: formData.title,
            description: formData.description || null,
            location: formData.location || null,
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            family_member_id: formData.family_member_id,
          })
          .eq('id', editingSchedule.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('schedules').insert({
          family_member_id: formData.family_member_id,
          title: formData.title,
          description: formData.description || null,
          location: formData.location || null,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
        })
        if (insertError) throw insertError
      }

      await reloadWeekSchedules()
      closeModals()
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editingSchedule) return
    if (!confirm('Supprimer cet événement ?')) return

    setLoading(true)
    setError('')
    try {
      const { error: deleteError } = await supabase
        .from('schedules')
        .delete()
        .eq('id', editingSchedule.id)
      if (deleteError) throw deleteError
      setLocalSchedules((prev) => prev.filter((s) => s.id !== editingSchedule.id))
      closeModals()
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSlotClick = (day: string, hour: number, memberId: string) => {
    openCreate(day, formatTimeLabel(hour), memberId)
  }

  const weekTitle = `${parseLocalDate(weekDays[0]).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })} au ${parseLocalDate(weekDays[6]).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`

  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i
  )

  const renderEventModal = () => {
    const isEdit = !!editingSchedule
    const isExternal = !!editingSchedule?.subscription_id
    const showModal = showCreateModal || editingSchedule

    if (!showModal) return null

    const isReadOnly =
      editingSchedule &&
      (!!editingSchedule.subscription_id || !canModify(editingSchedule))

    if (isReadOnly && editingSchedule) {
      return (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={closeModals} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-semibold mb-2">{editingSchedule.title}</h2>
              <p className="text-sm text-gray-600 mb-4">
                {editingSchedule.subscription_id
                  ? 'Événement iCal — lecture seule depuis le planning.'
                  : 'Lecture seule — vous ne pouvez modifier que vos propres événements.'}
              </p>
              <p className="text-sm">
                {editingSchedule.date} · {editingSchedule.start_time} – {editingSchedule.end_time}
              </p>
              <p className="text-sm mt-2">{getMemberLabel(editingSchedule.family_member_id)}</p>
              {editingSchedule.location && (
                <p className="text-sm mt-2 text-gray-600">{editingSchedule.location}</p>
              )}
              <button type="button" onClick={closeModals} className="btn btn-secondary mt-6 w-full">
                Fermer
              </button>
            </div>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={closeModals} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">
                  {isEdit ? 'Modifier l\'événement' : 'Nouvel événement'}
                </h2>
                <button
                  type="button"
                  onClick={closeModals}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isParent && (
                  <div>
                    <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-1">
                      Pour qui ?
                    </label>
                    <select
                      id="member"
                      value={formData.family_member_id}
                      onChange={(e) =>
                        setFormData({ ...formData, family_member_id: e.target.value })
                      }
                      className="input"
                    >
                      {familyMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {getMemberLabel(member.id)}
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
                    rows={2}
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Lieu (optionnel)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="location"
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(!showLocationPicker)}
                      className="btn btn-sm btn-secondary"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                  </div>
                  {showLocationPicker && (
                    <div className="mt-3 p-4 border rounded-lg">
                      <LocationPicker
                        value={formData.location}
                        onChange={(address) => setFormData({ ...formData, location: address })}
                        onClose={() => setShowLocationPicker(false)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
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
                      Début
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
                      Fin
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

                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
                  </button>
                  {isEdit && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={loading}
                      className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  )}
                  <button type="button" onClick={closeModals} className="btn btn-secondary">
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Planning famille</h1>
          <p className="text-gray-600 text-sm sm:text-base">{weekTitle}</p>
          <Link
            href="/dashboard/schedule"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2"
          >
            Abonnements iCal et horaires détaillés
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigateWeek(-1)}
            className="btn btn-secondary btn-sm p-2"
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button type="button" onClick={goToToday} className="btn btn-secondary btn-sm">
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={() => navigateWeek(1)}
            className="btn btn-secondary btn-sm p-2"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => openCreate(selectedDate)}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Événement
          </button>
        </div>
      </div>

      {error && !showCreateModal && !editingSchedule && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Grille semaine — une bande horaire par membre */}
      <div className="card overflow-x-auto">
        <div className="min-w-[800px]">
          {/* En-têtes jours (communs) */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 sticky top-0 z-30 bg-white">
            <div className="sticky left-0 z-40 bg-white" />
            {weekDays.map((day) => {
              const date = parseLocalDate(day)
              const isToday = day === today
              return (
                <div
                  key={day}
                  className={`p-2 text-center border-l border-gray-100 ${isToday ? 'bg-primary-50' : ''}`}
                >
                  <div className="text-xs text-gray-500 uppercase">
                    {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </div>
                  <div className={`font-semibold ${isToday ? 'text-primary-600' : ''}`}>
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {familyMembers.map((member, memberIndex) => {
            const memberSchedules = localSchedules.filter(
              (s) => s.family_member_id === member.id
            )
            const memberColor = getMemberColor(member, memberIds)
            const isLastMember = memberIndex === familyMembers.length - 1

            return (
              <section
                key={member.id}
                className={isLastMember ? '' : 'border-b-4 border-gray-200'}
                aria-label={`Planning de ${getMemberLabel(member.id)}`}
              >
                {/* Bandeau membre */}
                <div
                  className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 text-white"
                  style={{ backgroundColor: memberColor }}
                >
                  <div
                    className="sticky left-0 z-20 flex items-center gap-2 px-2 py-2 border-r border-white/20"
                    style={{ backgroundColor: memberColor }}
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      {member.avatar_url || '👤'}
                    </span>
                  </div>
                  <div className="col-span-7 flex items-center gap-2 px-3 py-2 font-semibold text-sm sm:text-base">
                    <span>{getMemberLabel(member.id)}</span>
                    <span className="opacity-80 text-xs font-normal capitalize">
                      {member.role === 'parent' ? 'Parent' : 'Enfant'}
                    </span>
                  </div>
                </div>

                {/* Grille horaire du membre */}
                <div className="grid grid-cols-[56px_repeat(7,1fr)]">
                  <div className="sticky left-0 z-10 bg-white border-r border-gray-200">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="text-xs text-gray-500 text-right pr-2 border-b border-gray-100"
                        style={{ height: SLOT_HEIGHT_PX }}
                      >
                        {formatTimeLabel(hour)}
                      </div>
                    ))}
                  </div>

                  {weekDays.map((day) => {
                    const daySchedules = memberSchedules.filter((s) => s.date === day)
                    const layouts = computeDayEventLayouts(daySchedules)
                    const isToday = day === today

                    return (
                      <div
                        key={day}
                        className={`relative border-l border-gray-100 ${isToday ? 'bg-primary-50/30' : ''}`}
                        style={{ height: GRID_HEIGHT_PX }}
                      >
                        {hours.map((hour) => (
                          <button
                            key={hour}
                            type="button"
                            className="absolute left-0 right-0 border-b border-gray-100 hover:bg-primary-100/40 transition-colors"
                            style={{
                              top: (hour - DAY_START_HOUR) * SLOT_HEIGHT_PX,
                              height: SLOT_HEIGHT_PX,
                            }}
                            onClick={() => handleSlotClick(day, hour, member.id)}
                            aria-label={`Ajouter un événement pour ${getMemberLabel(member.id)} le ${day} à ${formatTimeLabel(hour)}`}
                          />
                        ))}

                        {daySchedules.map((schedule) => {
                          const layout = layouts.get(schedule.id) || {
                            column: 0,
                            totalColumns: 1,
                            hasConflict: false,
                          }
                          const isExternal = !!schedule.subscription_id
                          const widthPct = 100 / layout.totalColumns
                          const leftPct = layout.column * widthPct
                          const top = getEventTopPx(schedule.start_time)
                          const height = getEventHeightPx(
                            schedule.start_time,
                            schedule.end_time
                          )
                          const subColor = getSubscriptionColor(schedule.subscription_id)

                          let className =
                            'absolute rounded px-1 py-0.5 text-xs overflow-hidden cursor-pointer border-l-4 shadow-sm z-10 text-white '
                          if (layout.hasConflict) {
                            className += 'bg-red-500 border-red-700'
                          } else if (isExternal) {
                            className += 'border-2'
                          }

                          return (
                            <button
                              key={schedule.id}
                              type="button"
                              className={className}
                              style={{
                                top,
                                height,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                                ...(layout.hasConflict
                                  ? {}
                                  : isExternal
                                    ? {
                                        backgroundColor: subColor,
                                        borderColor: subColor,
                                      }
                                    : {
                                        backgroundColor: memberColor,
                                        borderColor: memberColor,
                                      }),
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (canModify(schedule)) {
                                  openEdit(schedule)
                                } else {
                                  setEditingSchedule(schedule)
                                  setShowCreateModal(false)
                                }
                              }}
                              title={schedule.title}
                            >
                              <span className="font-medium block truncate">{schedule.title}</span>
                              <span className="opacity-90 truncate block">
                                {schedule.start_time.slice(0, 5)} –{' '}
                                {schedule.end_time.slice(0, 5)}
                              </span>
                              {isExternal && (
                                <span className="text-[10px] opacity-80">iCal</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Chaque membre dispose de sa propre ligne de planning. Cliquez sur un créneau pour ajouter
        un événement à cette personne. Les blocs rouges indiquent un conflit horaire.
      </p>

      {renderEventModal()}
    </div>
  )
}
