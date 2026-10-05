'use client'

import { useEffect, useState } from 'react'
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle, MessageSquare, Send } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/constants'
import { useAuth, Employee } from '@/lib/auth-context'

interface TodoComment {
  id: string
  author: string
  content: string
  createdAt: string
}

interface TodoItem {
  id: string
  todoId: string
  title: string
  description: string | null
  assignedTo: string | null
  deadline: string | null
  status: string
  createdAt: string
  comments: TodoComment[]
}

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Done']

const statusIcons: Record<string, typeof Circle> = {
  Pending: Circle,
  'In Progress': Clock,
  Done: CheckCircle2,
}

const statusColors: Record<string, string> = {
  Pending: 'text-muted-foreground',
  'In Progress': 'text-blue-500',
  Done: 'text-green',
}

export default function TodosPage() {
  const { canCreateTodo, currentEmployee } = useAuth()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', deadline: '' })
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])

  const load = () => {
    fetch('/api/todos').then(r => r.json()).then(setTodos)
  }

  useEffect(() => {
    load()
    fetch('/api/employees').then(r => r.json()).then((emps: Employee[]) => setEmployees(emps.filter(e => e.active)))
  }, [])

  const create = async () => {
    if (!form.title) return
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowNew(false)
    setForm({ title: '', description: '', assignedTo: '', deadline: '' })
    load()
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const updateAssignee = async (id: string, assignedTo: string) => {
    await fetch(`/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo }),
    })
    load()
  }

  const addComment = async (todoId: string) => {
    if (!commentText.trim()) return
    const author = currentEmployee?.name || 'Owner'
    await fetch(`/api/todos/${todoId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText, author }),
    })
    setCommentText('')
    load()
  }

  const filtered = filter === 'All' ? todos : todos.filter(t => t.status === filter)
  const now = new Date()

  const overdueCount = todos.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'Done').length
  const pendingCount = todos.filter(t => t.status === 'Pending').length
  const inProgressCount = todos.filter(t => t.status === 'In Progress').length
  const doneCount = todos.filter(t => t.status === 'Done').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">To-Do List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{todos.length} task{todos.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreateTodo && (
          <button
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { label: 'All', count: todos.length },
          { label: 'Pending', count: pendingCount },
          { label: 'In Progress', count: inProgressCount },
          { label: 'Done', count: doneCount },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilter(s.label)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              filter === s.label ? 'bg-accent text-accent-foreground border-accent' : 'bg-card border-border hover:bg-muted'
            }`}
          >
            {s.label}
            <span className="w-5 h-5 flex items-center justify-center bg-muted text-muted-foreground rounded-full text-xs">{s.count}</span>
          </button>
        ))}
        {overdueCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red/10 border border-red/20 rounded-lg text-xs font-medium text-red whitespace-nowrap">
            <AlertTriangle className="w-3.5 h-3.5" />
            {overdueCount} overdue
          </div>
        )}
      </div>

      {showNew && canCreateTodo && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold">New Task</h2>
          <input type="text" placeholder="Task title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
          <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring/20" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Assign To</label>
              <select
                value={form.assignedTo}
                onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={!form.title} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40">Create</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {filter === 'All' ? 'No tasks yet. Create your first task.' : `No ${filter.toLowerCase()} tasks.`}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(todo => {
            const isOverdue = todo.deadline && new Date(todo.deadline) < now && todo.status !== 'Done'
            const Icon = statusIcons[todo.status] || Circle
            const isExpanded = expandedTodo === todo.id

            return (
              <div key={todo.id} className={`bg-card border rounded-xl overflow-hidden ${isOverdue ? 'border-red/40' : 'border-border'}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => updateStatus(todo.id, todo.status === 'Done' ? 'Pending' : todo.status === 'Pending' ? 'In Progress' : 'Done')}
                      className={`mt-0.5 shrink-0 ${statusColors[todo.status]}`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-medium ${todo.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}>{todo.title}</p>
                          {todo.description && <p className="text-xs text-muted-foreground mt-0.5">{todo.description}</p>}
                        </div>
                        <select
                          value={todo.status}
                          onChange={e => updateStatus(todo.id, e.target.value)}
                          className="px-2 py-1 text-xs border border-border rounded-lg bg-background shrink-0"
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span>{todo.todoId}</span>
                        <span className="flex items-center gap-1">
                          Assign:
                          <select
                            value={todo.assignedTo || ''}
                            onChange={e => updateAssignee(todo.id, e.target.value)}
                            className="px-1.5 py-0.5 text-xs border border-border rounded bg-background"
                          >
                            <option value="">Unassigned</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.name}>{emp.name}</option>
                            ))}
                          </select>
                        </span>
                        {todo.deadline && (
                          <span className={isOverdue ? 'text-red font-medium' : ''}>
                            {isOverdue && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                            Due: {formatDate(todo.deadline)}
                          </span>
                        )}
                        <button
                          onClick={() => setExpandedTodo(isExpanded ? null : todo.id)}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {todo.comments.length}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-4">
                    {todo.comments.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {todo.comments.map(c => (
                          <div key={c.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{c.author}</span>
                              <span className="text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                            </div>
                            <p className="text-muted-foreground mt-0.5">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={expandedTodo === todo.id ? commentText : ''}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addComment(todo.id) }}
                        className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                      <button onClick={() => addComment(todo.id)} className="px-2 py-1.5 bg-accent text-accent-foreground rounded-lg">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
