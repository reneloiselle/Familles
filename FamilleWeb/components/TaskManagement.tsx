'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, CheckCircle2, Circle, Clock, Trash2, Edit2, Save, X } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface Task {
  id: string
  family_id: string
  assigned_to: string | null
  title: string
  description: string | null
  status: 'todo' | 'completed'
  priority?: 'low' | 'medium' | 'high'
  due_date: string | null
  created_by: string
  created_at?: string
  family_members?: {
    id: string
    user_id: string
    role: string
    avatar_url?: string | null
  }
}

interface FamilyMember {
  id: string
  user_id: string
  role: 'parent' | 'child'
  avatar_url?: string | null
  name?: string | null
  email?: string | null
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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  })
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Empêcher le scroll du body quand une modale est ouverte
  useEffect(() => {
    if (showForm || editingTaskId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showForm, editingTaskId])

  // Synchroniser les tâches initiales
  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  // Subscription Realtime pour les tâches
  useEffect(() => {
    const tasksChannel = supabase
      .channel(`tasks_changes_${familyMember.family_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `family_id=eq.${familyMember.family_id}`,
        },
        (payload) => {
          // Filtrer pour ne garder que les tâches créées par l'utilisateur ou assignées à l'utilisateur
          const shouldIncludeTask = (task: Task) => 
            task.created_by === user.id || task.assigned_to === familyMember.id

          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task
            // Charger les données de family_members si nécessaire
            if (newTask.assigned_to) {
              const member = familyMembers.find(m => m.id === newTask.assigned_to)
              if (member) {
                newTask.family_members = {
                  id: member.id,
                  user_id: member.user_id,
                  role: member.role,
                  avatar_url: member.avatar_url || null,
                }
              }
            }
            if (shouldIncludeTask(newTask)) {
              setLocalTasks((prev) => {
                // Vérifier si la tâche n'existe pas déjà
                if (prev.find(t => t.id === newTask.id)) {
                  return prev
                }
                const updated = [...prev, newTask]
                return updated.sort((a, b) => {
                  // Trier par priorité (high > medium > low) puis par due_date puis par created_at
                  const priorityOrder = { high: 3, medium: 2, low: 1 }
                  const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
                  const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
                  if (aPriority !== bPriority) {
                    return bPriority - aPriority // High priority first
                  }
                  if (a.due_date && b.due_date) {
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                  }
                  if (a.due_date) return -1
                  if (b.due_date) return 1
                  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                })
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task
            // Charger les données de family_members si nécessaire
            if (updatedTask.assigned_to) {
              const member = familyMembers.find(m => m.id === updatedTask.assigned_to)
              if (member) {
                updatedTask.family_members = {
                  id: member.id,
                  user_id: member.user_id,
                  role: member.role,
                  avatar_url: member.avatar_url || null,
                }
              }
            }
            if (shouldIncludeTask(updatedTask)) {
              setLocalTasks((prev) => {
                const exists = prev.find(t => t.id === updatedTask.id)
                if (exists) {
                  // Mettre à jour la tâche existante
                  return prev.map((task) =>
                    task.id === updatedTask.id ? updatedTask : task
                  ).sort((a, b) => {
                    // Trier par priorité (high > medium > low) puis par due_date puis par created_at
                    const priorityOrder = { high: 3, medium: 2, low: 1 }
                    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
                    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
                    if (aPriority !== bPriority) {
                      return bPriority - aPriority // High priority first
                    }
                    if (a.due_date && b.due_date) {
                      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                    }
                    if (a.due_date) return -1
                    if (b.due_date) return 1
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                  })
                } else {
                  // Ajouter si elle n'existe pas encore (peut arriver si elle vient d'être assignée)
                  return [...prev, updatedTask].sort((a, b) => {
                    // Trier par priorité (high > medium > low) puis par due_date puis par created_at
                    const priorityOrder = { high: 3, medium: 2, low: 1 }
                    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
                    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
                    if (aPriority !== bPriority) {
                      return bPriority - aPriority // High priority first
                    }
                    if (a.due_date && b.due_date) {
                      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                    }
                    if (a.due_date) return -1
                    if (b.due_date) return 1
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                  })
                }
              })
            } else {
              // Retirer si elle ne devrait plus être visible
              setLocalTasks((prev) => prev.filter((task) => task.id !== updatedTask.id))
            }
          } else if (payload.eventType === 'DELETE') {
            setLocalTasks((prev) => prev.filter((task) => task.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
    }
  }, [familyMember.family_id, familyMember.id, user.id, familyMembers, supabase])

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingTaskId) {
          setEditingTaskId(null)
          setEditFormData({
            title: '',
            description: '',
            assigned_to: '',
            due_date: '',
          })
        } else if (showForm) {
          setShowForm(false)
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [editingTaskId, showForm])

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
          priority: formData.priority,
          status: 'todo',
          created_by: user.id,
        })

      if (error) throw error

      // Ne pas utiliser router.refresh() car Realtime mettra à jour automatiquement
      setShowForm(false)
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        priority: 'medium',
      })
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la tâche')
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'completed') => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      // Ne pas utiliser router.refresh() car Realtime mettra à jour automatiquement
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id)
    setEditFormData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      priority: task.priority || 'medium',
    })
  }

  const cancelEditing = () => {
    setEditingTaskId(null)
    setEditFormData({
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
    })
  }

  const updateTask = async (taskId: string) => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editFormData.title,
          description: editFormData.description || null,
          assigned_to: editFormData.assigned_to || null,
          due_date: editFormData.due_date || null,
          priority: editFormData.priority,
        })
        .eq('id', taskId)

      if (error) throw error

      // Ne pas utiliser router.refresh() car Realtime mettra à jour automatiquement
      setEditingTaskId(null)
      setEditFormData({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        priority: 'medium',
      })
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour de la tâche')
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

      // Ne pas utiliser router.refresh() car Realtime mettra à jour automatiquement
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
    // Utiliser name, puis email, puis ID
    return member.name || member.email || `Membre ${member.id.slice(0, 8)}`
  }

  const getMemberDisplayName = (member: FamilyMember) => {
    if (member.user_id === user.id) return 'Vous'
    return member.name || member.email || `Membre ${member.id.slice(0, 8)}`
  }

  const getMemberAvatar = (memberId: string | null) => {
    if (!memberId) return null
    const member = familyMembers.find(m => m.id === memberId)
    return member?.avatar_url || '👤'
  }

  const filteredTasks = statusFilter === 'all'
    ? localTasks
    : localTasks.filter(t => t.status === statusFilter)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Complété'
      default:
        return 'À faire'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-gray-400'
      default:
        return 'text-gray-400'
    }
  }

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'Haute'
      case 'medium':
        return 'Moyenne'
      case 'low':
        return 'Basse'
      default:
        return 'Moyenne'
    }
  }

  const getRelativeDateText = (dueDate: string, isCompleted: boolean) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const due = new Date(dueDate)
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    const difference = Math.floor((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (isCompleted) {
      if (difference === 0) {
        return 'Aujourd\'hui'
      } else if (difference === 1) {
        return 'Demain'
      } else if (difference > 1) {
        return `Dans ${difference} jours`
      } else if (difference === -1) {
        return 'Hier'
      } else {
        return `Dépassé de ${-difference} jour${-difference > 1 ? 's' : ''}`
      }
    } else {
      if (difference === 0) {
        return 'Aujourd\'hui'
      } else if (difference === 1) {
        return 'Demain'
      } else if (difference > 1) {
        return `Dans ${difference} jours`
      } else if (difference === -1) {
        return 'Dépassé d\'1 jour'
      } else {
        return `Dépassé de ${-difference} jour${-difference > 1 ? 's' : ''}`
      }
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
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
              setStatusFilter('todo')
              router.push('/dashboard/tasks?status=todo')
            }}
            className={`btn ${statusFilter === 'todo' ? 'btn-primary' : 'btn-secondary'}`}
          >
            À faire
          </button>
          <button
            onClick={() => {
              setStatusFilter('completed')
              router.push('/dashboard/tasks?status=completed')
            }}
            className={`btn ${statusFilter === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Complétées
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

      {/* Modale de création */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
            onClick={() => setShowForm(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">Nouvelle tâche</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
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
                      {getMemberDisplayName(member)}
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

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priorité
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="input"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
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
            </div>
          </div>
        </>
      )}

      {/* Modale d'édition */}
      {editingTaskId && (
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
                  <h2 className="text-2xl font-semibold">Modifier la tâche</h2>
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
                  const task = localTasks.find(t => t.id === editingTaskId)
                  if (!task) return null
                  
                  return (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        updateTask(task.id)
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label htmlFor={`edit-title-${task.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Titre
                        </label>
                        <input
                          id={`edit-title-${task.id}`}
                          type="text"
                          value={editFormData.title}
                          onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                          required
                          className="input"
                          placeholder="Faire les courses, Rendre devoir, etc."
                          autoFocus
                        />
                      </div>

                      <div>
                        <label htmlFor={`edit-description-${task.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Description (optionnel)
                        </label>
                        <textarea
                          id={`edit-description-${task.id}`}
                          value={editFormData.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="input"
                          rows={3}
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor={`edit-assigned-${task.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Assigner à
                          </label>
                          <select
                            id={`edit-assigned-${task.id}`}
                            value={editFormData.assigned_to}
                            onChange={(e) => setEditFormData({ ...editFormData, assigned_to: e.target.value })}
                            className="input"
                          >
                            <option value="">Non assigné</option>
                            {familyMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {getMemberDisplayName(member)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor={`edit-due-date-${task.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Date d'échéance (optionnel)
                          </label>
                          <input
                            id={`edit-due-date-${task.id}`}
                            type="date"
                            value={editFormData.due_date}
                            onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                            className="input"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`edit-priority-${task.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Priorité
                        </label>
                        <select
                          id={`edit-priority-${task.id}`}
                          value={editFormData.priority}
                          onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                          className="input"
                        >
                          <option value="low">Basse</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button type="submit" disabled={loading} className="btn btn-primary flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {loading ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="btn btn-secondary flex items-center gap-2"
                          disabled={loading}
                        >
                          <X className="w-4 h-4" />
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
              className={`card border-l-4 ${task.status === 'completed' ? 'border-green-500' : 'border-yellow-500'}`}
            >
              {/* Affichage normal */}
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 pt-1">
                      {getStatusIcon(task.status)}
                    </div>
                    <h3 className="font-semibold text-lg flex-1 min-w-0 break-words">{task.title}</h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.status === 'todo' && (
                        <button
                          onClick={() => startEditing(task)}
                          className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          disabled={loading}
                          title="Modifier"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      {(task.created_by === user.id || familyMember.role === 'parent') && (
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Supprimer"
                          disabled={loading}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-gray-600 mb-3">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                    <span>
                      Priorité: <strong className={getPriorityColor(task.priority)}>
                        {getPriorityLabel(task.priority)}
                      </strong>
                    </span>
                    <span>
                      Assigné à: <strong>
                        {task.assigned_to && <span className="mr-1 text-lg">{getMemberAvatar(task.assigned_to)}</span>}
                        {getMemberName(task.assigned_to)}
                      </strong>
                    </span>
                    {task.due_date && (
                      <span>
                        Échéance: <strong className={
                          new Date(task.due_date) < new Date() && task.status !== 'completed'
                            ? 'text-red-600'
                            : ''
                        }>
                          {new Date(task.due_date).toLocaleDateString('fr-FR')} - {getRelativeDateText(task.due_date, task.status === 'completed')}
                        </strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {task.status === 'todo' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="btn btn-primary text-sm"
                        disabled={loading}
                      >
                        Marquer comme complété
                      </button>
                    )}

                    {task.status === 'completed' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'todo')}
                        className="btn btn-secondary text-sm"
                        disabled={loading}
                      >
                        Rouvrir
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


