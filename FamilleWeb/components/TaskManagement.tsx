'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface Task {
  id: string
  family_id: string
  assigned_to: string | null
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  due_date: string | null
  created_by: string
  family_members?: {
    id: string
    user_id: string
    role: string
  }
}

interface FamilyMember {
  id: string
  user_id: string
  role: 'parent' | 'child'
}

interface TaskManagementProps {
  user: User
  familyMember: any
  familyMembers: FamilyMember[]
  tasks: Task[]
  initialStatus: string
}

export function TaskManagement({
  user,
  familyMember,
  familyMembers,
  tasks,
  initialStatus,
}: TaskManagementProps) {
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          family_id: familyMember.family_id,
          title: formData.title,
          description: formData.description || null,
          assigned_to: formData.assigned_to || null,
          due_date: formData.due_date || null,
          status: 'pending',
          created_by: user.id,
        })

      if (error) throw error

      router.refresh()
      setShowForm(false)
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
      })
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la tâche')
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      return
    }

    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression')
    } finally {
      setLoading(false)
    }
  }

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return 'Non assigné'
    const member = familyMembers.find(m => m.id === memberId)
    if (!member) return 'Membre inconnu'
    if (member.user_id === user.id) return 'Vous'
    return `Membre ${member.id.slice(0, 8)}`
  }

  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === statusFilter)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminé'
      case 'in_progress':
        return 'En cours'
      default:
        return 'En attente'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setStatusFilter('all')
              router.push('/dashboard/tasks?status=all')
            }}
            className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Toutes
          </button>
          <button
            onClick={() => {
              setStatusFilter('pending')
              router.push('/dashboard/tasks?status=pending')
            }}
            className={`btn ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          >
            En attente
          </button>
          <button
            onClick={() => {
              setStatusFilter('in_progress')
              router.push('/dashboard/tasks?status=in_progress')
            }}
            className={`btn ${statusFilter === 'in_progress' ? 'btn-primary' : 'btn-secondary'}`}
          >
            En cours
          </button>
          <button
            onClick={() => {
              setStatusFilter('completed')
              router.push('/dashboard/tasks?status=completed')
            }}
            className={`btn ${statusFilter === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Terminées
          </button>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouvelle tâche
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Nouvelle tâche</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Faire les courses, Rendre devoir, etc."
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

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
                  Assigner à
                </label>
                <select
                  id="assigned_to"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="input"
                >
                  <option value="">Non assigné</option>
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.user_id === user.id ? 'Vous' : `Membre ${member.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'échéance (optionnel)
                </label>
                <input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Création...' : 'Créer la tâche'}
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

      {filteredTasks.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {statusFilter === 'all' 
              ? 'Aucune tâche pour le moment'
              : `Aucune tâche ${getStatusLabel(statusFilter).toLowerCase()}`
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`card border-l-4 ${
                task.status === 'completed' ? 'border-green-500' :
                task.status === 'in_progress' ? 'border-blue-500' :
                'border-yellow-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(task.status)}
                    <h3 className="font-semibold text-lg">{task.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 mb-3">{task.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span>
                      Assigné à: <strong>{getMemberName(task.assigned_to)}</strong>
                    </span>
                    {task.due_date && (
                      <span>
                        Échéance: <strong>
                          {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {task.status !== 'completed' && (
                    <>
                      {task.status === 'pending' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          disabled={loading}
                        >
                          Démarrer
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="text-green-600 hover:text-green-800 text-sm"
                          disabled={loading}
                        >
                          Terminer
                        </button>
                      )}
                    </>
                  )}
                  
                  {task.status === 'completed' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'pending')}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                      disabled={loading}
                    >
                      Rouvrir
                    </button>
                  )}
                  
                  {(task.created_by === user.id || familyMember.role === 'parent') && (
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

