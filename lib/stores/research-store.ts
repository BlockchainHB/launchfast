import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import type { ProductData, MarketAnalysisResult } from '@/types'

export interface ResearchJob {
  id: string
  type: 'keyword' | 'asin'
  query: string // keyword or ASIN
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: number
  endTime?: number
  currentPhase?: string
  progress?: number
  results?: ProductData[]
  marketAnalysis?: MarketAnalysisResult
  error?: string
  eventSource?: EventSource
}

interface ResearchStore {
  // State
  jobs: Record<string, ResearchJob>
  activeJobId: string | null
  
  // Actions
  startResearch: (type: 'keyword' | 'asin', query: string) => string
  updateJobProgress: (jobId: string, phase: string, progress?: number) => void
  updateJobResults: (jobId: string, results: ProductData[], marketAnalysis?: MarketAnalysisResult) => void
  completeJob: (jobId: string) => void
  failJob: (jobId: string, error: string) => void
  cancelJob: (jobId: string) => void
  clearJob: (jobId: string) => void
  getActiveJob: () => ResearchJob | null
  getJob: (jobId: string) => ResearchJob | null
  
  // EventSource management
  connectEventSource: (jobId: string, endpoint: string) => void
  disconnectEventSource: (jobId: string) => void
  cleanup: () => void
}

export const useResearchStore = create<ResearchStore>()(
  persist(
    (set, get) => ({
      jobs: {},
      activeJobId: null,

      startResearch: (type: 'keyword' | 'asin', query: string) => {
        const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const job: ResearchJob = {
          id: jobId,
          type,
          query,
          status: 'running',
          startTime: Date.now(),
          currentPhase: 'initializing'
        }

        set((state) => ({
          jobs: { ...state.jobs, [jobId]: job },
          activeJobId: jobId
        }))

        // Show initial toast
        toast.loading(`Starting ${type} research for "${query}"...`, {
          id: `research-${jobId}`,
          duration: Infinity
        })

        return jobId
      },

      updateJobProgress: (jobId: string, phase: string, progress?: number) => {
        set((state) => {
          const job = state.jobs[jobId]
          if (!job) return state

          const updatedJob = {
            ...job,
            currentPhase: phase,
            progress
          }

          // Update toast with progress
          toast.loading(`${phase.replace(/_/g, ' ')}...`, {
            id: `research-${jobId}`,
            duration: Infinity
          })

          return {
            ...state,
            jobs: { ...state.jobs, [jobId]: updatedJob }
          }
        })
      },

      updateJobResults: (jobId: string, results: ProductData[], marketAnalysis?: MarketAnalysisResult) => {
        set((state) => {
          const job = state.jobs[jobId]
          if (!job) return state

          const updatedJob = {
            ...job,
            results,
            marketAnalysis
          }

          return {
            ...state,
            jobs: { ...state.jobs, [jobId]: updatedJob }
          }
        })
      },

      completeJob: (jobId: string) => {
        set((state) => {
          const job = state.jobs[jobId]
          if (!job) return state

          const updatedJob = {
            ...job,
            status: 'completed' as const,
            endTime: Date.now()
          }

          // Show success toast
          toast.success(
            `Research for "${job.query}" completed! Found ${job.results?.length || 0} products.`,
            {
              id: `research-${jobId}`,
              duration: 5000,
              action: {
                label: "View Results",
                onClick: () => {
                  // This will be handled by the modal component
                  const event = new CustomEvent('research-view-results', { detail: { jobId } })
                  window.dispatchEvent(event)
                }
              }
            }
          )

          return {
            ...state,
            jobs: { ...state.jobs, [jobId]: updatedJob },
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId
          }
        })
      },

      failJob: (jobId: string, error: string) => {
        set((state) => {
          const job = state.jobs[jobId]
          if (!job) return state

          const updatedJob = {
            ...job,
            status: 'failed' as const,
            endTime: Date.now(),
            error
          }

          // Show error toast
          toast.error(
            `Research for "${job.query}" failed: ${error}`,
            {
              id: `research-${jobId}`,
              duration: 5000,
              action: {
                label: "Retry",
                onClick: () => {
                  // This will be handled by the modal component
                  const event = new CustomEvent('research-retry', { detail: { jobId } })
                  window.dispatchEvent(event)
                }
              }
            }
          )

          return {
            ...state,
            jobs: { ...state.jobs, [jobId]: updatedJob },
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId
          }
        })
      },

      cancelJob: (jobId: string) => {
        const { jobs } = get()
        const job = jobs[jobId]
        if (!job) return

        // Close EventSource if exists
        if (job.eventSource) {
          job.eventSource.close()
        }

        set((state) => {
          const updatedJob = {
            ...job,
            status: 'cancelled' as const,
            endTime: Date.now()
          }

          // Dismiss toast
          toast.dismiss(`research-${jobId}`)

          return {
            ...state,
            jobs: { ...state.jobs, [jobId]: updatedJob },
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId
          }
        })
      },

      clearJob: (jobId: string) => {
        set((state) => {
          const newJobs = { ...state.jobs }
          delete newJobs[jobId]
          
          // Dismiss any remaining toasts
          toast.dismiss(`research-${jobId}`)

          return {
            ...state,
            jobs: newJobs,
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId
          }
        })
      },

      getActiveJob: () => {
        const { jobs, activeJobId } = get()
        return activeJobId ? jobs[activeJobId] || null : null
      },

      getJob: (jobId: string) => {
        const { jobs } = get()
        return jobs[jobId] || null
      },

      connectEventSource: (jobId: string, endpoint: string) => {
        const { jobs } = get()
        const job = jobs[jobId]
        if (!job) return

        // Close existing EventSource if any
        if (job.eventSource) {
          job.eventSource.close()
        }

        console.log(`🔌 Connecting EventSource for job ${jobId}: ${endpoint}`)
        const eventSource = new EventSource(endpoint)
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const store = get()
            
            // Handle different event formats from backend
            const eventType = data.type || data.phase
            
            switch (eventType) {
              case 'phase_update':
              case 'marketplace_analysis':
              case 'validating_market':
              case 'applying_grading':
                const phase = data.phase || eventType
                const progress = data.progress || 
                  (phase === 'marketplace_analysis' ? 25 : 
                   phase === 'validating_market' ? 50 : 
                   phase === 'applying_grading' ? 75 : 0)
                
                store.updateJobProgress(jobId, phase, progress)
                
                // Update toast with current progress
                toast.loading(`${phase.replace(/_/g, ' ')}... ${progress}%`, {
                  id: `research-${jobId}`,
                  duration: Infinity
                })

                // Emit event for display controller
                window.dispatchEvent(new CustomEvent('research-progress', { 
                  detail: { jobId, phase, progress, data } 
                }))
                break
                
              case 'products_update':
                if (data.products && data.marketAnalysis) {
                  store.updateJobResults(jobId, data.products, data.marketAnalysis)
                }
                break
                
              case 'complete':
                if (data.data?.products || data.products) {
                  const products = data.data?.products || data.products
                  const marketAnalysis = data.data?.marketAnalysis || data.marketAnalysis
                  store.updateJobResults(jobId, products, marketAnalysis)
                }
                store.completeJob(jobId)
                break
                
              case 'error':
                store.failJob(jobId, data.message || data.data?.message || 'Unknown error occurred')
                break
                
              default:
                // Handle legacy format
                if (data.phase === 'complete') {
                  if (data.data?.products) {
                    store.updateJobResults(jobId, data.data.products, data.data.marketAnalysis)
                  }
                  store.completeJob(jobId)
                } else if (data.phase === 'error') {
                  store.failJob(jobId, data.message || 'Unknown error occurred')
                } else if (data.phase) {
                  store.updateJobProgress(jobId, data.phase, data.progress)
                  
                  // Update toast
                  toast.loading(`${data.phase.replace(/_/g, ' ')}...`, {
                    id: `research-${jobId}`,
                    duration: Infinity
                  })

                  // Emit event for display controller
                  window.dispatchEvent(new CustomEvent('research-progress', { 
                    detail: { jobId, phase: data.phase, progress: data.progress, data } 
                  }))
                }
                break
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error)
            const store = get()
            store.failJob(jobId, 'Failed to process server response')
          }
        }

        eventSource.onopen = () => {
          console.log(`✅ EventSource connected for job ${jobId}`)
        }

        eventSource.onerror = (error) => {
          console.error(`❌ EventSource error for job ${jobId}:`, error)
          console.log(`EventSource readyState: ${eventSource.readyState}`)
          console.log(`EventSource URL: ${eventSource.url}`)
          
          // Check if this is an immediate failure (likely auth issue)
          if (eventSource.readyState === EventSource.CLOSED) {
            const store = get()
            const currentJob = store.jobs[jobId]
            
            if (currentJob && currentJob.status === 'running') {
              console.log(`🔥 Immediately failing job ${jobId} - connection closed`)
              store.failJob(jobId, 'Authentication failed or server unavailable')
            }
          } else {
            // Add a delay before failing to allow for reconnection attempts
            setTimeout(() => {
              if (eventSource.readyState === EventSource.CLOSED) {
                const store = get()
                const currentJob = store.jobs[jobId]
                
                // Only fail if the job is still running (not already completed/failed)
                if (currentJob && currentJob.status === 'running') {
                  console.log(`🔥 Failing job ${jobId} after timeout - connection lost`)
                  store.failJob(jobId, 'Connection lost during research')
                }
              }
            }, 2000) // Wait 2 seconds for potential reconnection
          }
        }

        // Store EventSource reference
        set((state) => ({
          ...state,
          jobs: {
            ...state.jobs,
            [jobId]: {
              ...state.jobs[jobId],
              eventSource
            }
          }
        }))
      },

      disconnectEventSource: (jobId: string) => {
        const { jobs } = get()
        const job = jobs[jobId]
        if (job?.eventSource) {
          job.eventSource.close()
          
          set((state) => ({
            ...state,
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...state.jobs[jobId],
                eventSource: undefined
              }
            }
          }))
        }
      },

      cleanup: () => {
        const { jobs } = get()
        
        // Close all EventSources
        Object.values(jobs).forEach(job => {
          if (job.eventSource) {
            job.eventSource.close()
          }
        })

        // Clear old completed/failed jobs (older than 30 minutes)
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000)
        const activeJobs = Object.fromEntries(
          Object.entries(jobs).filter(([_, job]) => {
            if (job.status === 'running') return true
            if (job.endTime && job.endTime > thirtyMinutesAgo) return true
            return false
          })
        )

        set({ jobs: activeJobs })
      }
    }),
    {
      name: 'research-store',
      // Only persist job metadata, not EventSource objects
      partialize: (state) => ({
        jobs: Object.fromEntries(
          Object.entries(state.jobs).map(([id, job]) => [
            id,
            {
              ...job,
              eventSource: undefined // Don't persist EventSource
            }
          ])
        ),
        activeJobId: state.activeJobId
      }),
      // Rehydrate EventSources for running jobs on app start
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          // Clean up old jobs and mark running jobs as failed (they won't reconnect properly)
          Object.entries(state.jobs).forEach(([jobId, job]) => {
            if (job.status === 'running') {
              // Mark as failed since we can't restore EventSource connections
              state.failJob(jobId, 'Connection lost during page refresh')
            }
          })
          state.cleanup()
          
          // Setup global event listeners
          setupGlobalListeners(state)
        }
      }
    }
  )
)

// Utility hook for easier job access
export const useActiveResearchJob = () => {
  const activeJob = useResearchStore(state => state.getActiveJob())
  return activeJob
}

export const useResearchJob = (jobId: string | null) => {
  const getJob = useResearchStore(state => state.getJob)
  return jobId ? getJob(jobId) : null
}

// Global event listeners setup - internal to store
function setupGlobalListeners(store: any) {
  if (typeof window === 'undefined') return

  // Handle page visibility changes
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // When tab becomes visible, check for stale connections
      const jobs = store.jobs
      Object.entries(jobs).forEach(([jobId, job]: [string, any]) => {
        if (job.status === 'running' && job.eventSource) {
          // Check if EventSource is still connected
          if (job.eventSource.readyState === EventSource.CLOSED) {
            store.failJob(jobId, 'Connection lost while tab was inactive')
          }
        }
      })
    }
  }

  // Handle window focus
  const handleFocus = () => {
    // Trigger cleanup when window regains focus
    store.cleanup()
  }

  // Handle before unload
  const handleBeforeUnload = () => {
    // Close all EventSource connections
    store.cleanup()
  }

  // Setup event listeners (avoid duplicates)
  if (!(window as any).__researchStoreSetup) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup interval - run every 5 minutes
    setInterval(() => {
      store.cleanup()
    }, 5 * 60 * 1000)

    // Mark as setup
    ;(window as any).__researchStoreSetup = true
  }
}