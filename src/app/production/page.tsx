'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PRODUCTION_STAGES, ORDER_CHANNELS, formatDate, getDeliveryRisk } from '@/lib/constants'

interface Job {
  id: string
  jobNumber: string
  garmentType: string
  currentStage: string
  deliveryDate: string | null
  assignedWorker: string | null
  order: {
    id: string
    orderNumber: number
    deliveryDate: string
    channel: string
    customer: { name: string }
  }
  style: { styleCode: string; name: string } | null
}

export default function ProductionPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stageFilter, setStageFilter] = useState('All')
  const [channelFilter, setChannelFilter] = useState('All')

  const load = () => {
    const params = new URLSearchParams()
    if (stageFilter !== 'All') params.set('stage', stageFilter)
    fetch(`/api/jobs?${params}`).then(r => r.json()).then(setJobs)
  }

  useEffect(() => { load() }, [stageFilter])

  const changeStage = async (jobId: string, newStage: string) => {
    await fetch(`/api/jobs/${jobId}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
    load()
  }

  const filteredJobs = channelFilter === 'All'
    ? jobs
    : jobs.filter(j => j.order.channel === channelFilter)

  const groupedJobs = stageFilter === 'All'
    ? PRODUCTION_STAGES.reduce((acc, stage) => {
        const stageJobs = filteredJobs.filter(j => j.currentStage === stage)
        if (stageJobs.length > 0) acc.push({ stage, jobs: stageJobs })
        return acc
      }, [] as Array<{ stage: string; jobs: Job[] }>)
    : [{ stage: stageFilter, jobs: filteredJobs }]

  const riskDot = { green: 'bg-green', amber: 'bg-amber', red: 'bg-red' }

  const totalActive = filteredJobs.filter(j => j.currentStage !== 'Delivered').length
  const stageStats = PRODUCTION_STAGES.slice(0, -1).map(stage => ({
    stage,
    count: filteredJobs.filter(j => j.currentStage === stage).length,
  })).filter(s => s.count > 0)

  const channelCounts = ['All', ...ORDER_CHANNELS].map(ch => ({
    channel: ch,
    count: ch === 'All' ? jobs.length : jobs.filter(j => j.order.channel === ch).length,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Production</h1>
        <span className="text-sm text-muted-foreground">{totalActive} active job{totalActive !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {channelCounts.map(c => (
          <button
            key={c.channel}
            onClick={() => setChannelFilter(c.channel)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              channelFilter === c.channel
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-card border-border hover:bg-muted'
            }`}
          >
            {c.channel} ({c.count})
          </button>
        ))}
      </div>

      {stageFilter === 'All' && stageStats.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {stageStats.map(s => (
            <button
              key={s.stage}
              onClick={() => setStageFilter(s.stage)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium hover:bg-muted whitespace-nowrap"
            >
              <span className="w-5 h-5 flex items-center justify-center bg-accent text-accent-foreground rounded-full text-xs font-bold">{s.count}</span>
              {s.stage}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 overflow-x-auto">
        <button
          onClick={() => setStageFilter('All')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
            stageFilter === 'All' ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Stages
        </button>
        {PRODUCTION_STAGES.filter(s => s !== 'Delivered').map(s => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              stageFilter === s ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filteredJobs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          No active jobs found{channelFilter !== 'All' ? ` for ${channelFilter}` : ''}.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedJobs.map(group => (
            <div key={group.stage}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide">{group.stage}</h2>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{group.jobs.length}</span>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {group.jobs.map((job, i) => {
                  const dd = job.deliveryDate || job.order.deliveryDate
                  const risk = getDeliveryRisk(dd, job.currentStage)

                  return (
                    <div key={job.id} className={`flex items-center gap-4 px-4 py-3 ${i < group.jobs.length - 1 ? 'border-b border-border' : ''}`}>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${riskDot[risk]}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/orders/${job.order.id}`} className="text-sm font-semibold hover:underline">
                            #{job.jobNumber}
                          </Link>
                          <span className="text-sm text-muted-foreground">{job.garmentType}</span>
                          {job.style && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{job.style.styleCode || job.style.name}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {job.order.customer.name} · Delivery: {formatDate(dd)}
                          {job.assignedWorker && ` · Worker: ${job.assignedWorker}`}
                          <span className="ml-1 px-1.5 py-0.5 bg-muted rounded text-xs">{job.order.channel}</span>
                        </p>
                      </div>

                      {job.currentStage !== 'Delivered' && (
                        <div className="shrink-0">
                          <select
                            value={job.currentStage}
                            onChange={e => changeStage(job.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
                          >
                            {PRODUCTION_STAGES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
