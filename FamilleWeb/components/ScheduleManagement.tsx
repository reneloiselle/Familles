'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface Schedule {
  id: string
  family_member_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  date: string
  family_members?: {
    id: string
    user_id: string | null
    role: string
  }
}

interface FamilyMember {
  id: string
  user_id: string | null
  role: 'parent' | 'child'
  email?: string | null
  name?: string | null
}

interface ScheduleManagementProps {
  user: User
  familyMember: any
  familyMembers: FamilyMember[]
  schedules: Schedule[]
  initialDate: string
  initialView: string
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
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [view, setView] = useState(initialView)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    family_member_id: familyMember.id,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

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
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
        })

      if (error) throw error

      router.refresh()
      setShowForm(false)
      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
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

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression')
    } finally {
      setLoading(false)
    }
  }

  // Calculate week days (Monday to Sunday)
  const getWeekDays = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00') // Add time to avoid timezone issues
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday (0)
    const monday = new Date(date)
    monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(d.toISOString().split('T')[0])
    }
    return days
  }

  const weekDays = view === 'week' ? getWeekDays(selectedDate) : []

  const filteredSchedules = view === 'personal'
    ? schedules.filter(s => s.family_members?.user_id === user.id)
    : view === 'week'
    ? schedules // Show all schedules for the week
    : schedules.filter(s => s.date === selectedDate)

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

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        {isParent && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setView('personal')
                router.push(`/dashboard/schedule?view=personal`)
              }}
              className={`btn ${view === 'personal' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Mon agenda
            </button>
            <button
              onClick={() => {
                setView('family')
                router.push(`/dashboard/schedule?view=family&date=${selectedDate}`)
              }}
              className={`btn ${view === 'family' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Vue famille complète
            </button>
            <button
              onClick={() => {
                setView('week')
                router.push(`/dashboard/schedule?view=week&date=${selectedDate}`)
              }}
              className={`btn ${view === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Vue semaine
            </button>
          </div>
        )}

        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ajouter un horaire
        </button>
      </div>

      {(view === 'family' || view === 'week') && (
        <div className="card">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            {view === 'week' ? 'Semaine à visualiser' : 'Date à visualiser'}
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
            {view === 'week' && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate)
                    newDate.setDate(newDate.getDate() - 7)
                    setSelectedDate(newDate.toISOString().split('T')[0])
                    router.push(`/dashboard/schedule?view=week&date=${newDate.toISOString().split('T')[0]}`)
                  }}
                  className="btn btn-secondary"
                >
                  ← Semaine précédente
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate)
                    newDate.setDate(newDate.getDate() + 7)
                    setSelectedDate(newDate.toISOString().split('T')[0])
                    router.push(`/dashboard/schedule?view=week&date=${newDate.toISOString().split('T')[0]}`)
                  }}
                  className="btn btn-secondary"
                >
                  Semaine suivante →
                </button>
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0]
                    setSelectedDate(today)
                    router.push(`/dashboard/schedule?view=week&date=${today}`)
                  }}
                  className="btn btn-secondary"
                >
                  Cette semaine
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Nouvel horaire</h2>
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

            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Création...' : 'Créer l\'horaire'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'family' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Horaire de la famille - {new Date(selectedDate).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h2>
          
          {filteredSchedules.length === 0 ? (
            <p className="text-gray-500">Aucun horaire pour cette date</p>
          ) : (
            <div className="space-y-4">
              {filteredSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border-l-4 border-primary-500 pl-4 py-3 bg-gray-50 rounded"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{schedule.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
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
                    </div>
                    {(isParent || schedule.family_members?.user_id === user.id) && (
                      <button
                        onClick={() => deleteSchedule(schedule.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                    {schedules.map((schedule: Schedule) => (
                      <div
                        key={schedule.id}
                        className="border-l-4 border-primary-500 pl-4 py-3 bg-gray-50 rounded"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{schedule.title}</h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {schedule.start_time} - {schedule.end_time}
                              </span>
                            </div>
                            {schedule.description && (
                              <p className="text-sm text-gray-600 mt-2">{schedule.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteSchedule(schedule.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
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
                    const date = new Date(day)
                    const isToday = day === new Date().toISOString().split('T')[0]
                    return (
                      <th
                        key={day}
                        className={`border border-gray-300 bg-gray-100 p-3 text-center font-semibold min-w-[120px] ${
                          isToday ? 'bg-primary-100' : ''
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
                              {daySchedules.map((schedule: Schedule) => (
                                <div
                                  key={schedule.id}
                                  className="bg-primary-500 text-white rounded p-2 text-xs cursor-pointer hover:bg-primary-600 transition-colors"
                                  title={`${schedule.title} - ${schedule.start_time} à ${schedule.end_time}`}
                                >
                                  <div className="font-semibold truncate">{schedule.title}</div>
                                  <div className="text-primary-100 text-[10px]">
                                    {schedule.start_time} - {schedule.end_time}
                                  </div>
                                </div>
                              ))}
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
    </div>
  )
}

