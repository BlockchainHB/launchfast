interface ProgressEvent {
  phase: 'marketplace_analysis' | 'validating_market' | 'applying_grading' | 'complete' | 'error'
  message: string
  progress: number
  data?: any
  timestamp: string
}

interface DisplayState {
  currentPhase: string
  phaseMessage: string
  phaseData: any
  progress: number
  canAdvance: boolean
}

export class ProgressDisplayController {
  private minDisplayTime = 2000 // 2 seconds minimum per phase
  private currentPhaseStartTime = 0
  private queuedEvents: ProgressEvent[] = []
  private currentDisplayState: DisplayState
  private onStateChange: (state: DisplayState) => void
  private advanceTimer: NodeJS.Timeout | null = null

  constructor(onStateChange: (state: DisplayState) => void) {
    this.onStateChange = onStateChange
    this.currentDisplayState = {
      currentPhase: '',
      phaseMessage: '',
      phaseData: null,
      progress: 0,
      canAdvance: false
    }
  }

  /**
   * Handle incoming backend events
   */
  handleBackendEvent(event: ProgressEvent) {
    console.log('🎯 Display Controller: Received event', event.phase, event.progress)
    
    // Always queue the event
    this.queuedEvents.push(event)
    
    // If this is the first event or we can advance immediately
    if (!this.currentDisplayState.currentPhase || this.canAdvanceToNextPhase()) {
      this.advanceToNextPhase()
    } else {
      // Schedule advancement when minimum time is met
      this.scheduleAdvancement()
    }
  }

  /**
   * Check if we can advance to the next phase
   */
  private canAdvanceToNextPhase(): boolean {
    const timeInCurrentPhase = Date.now() - this.currentPhaseStartTime
    const hasQueuedEvent = this.queuedEvents.length > 0
    const minTimeElapsed = timeInCurrentPhase >= this.minDisplayTime
    
    return hasQueuedEvent && (minTimeElapsed || !this.currentDisplayState.currentPhase)
  }

  /**
   * Advance to the next queued phase
   */
  private advanceToNextPhase() {
    if (this.queuedEvents.length === 0) return

    // Clear any pending advancement timer
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer)
      this.advanceTimer = null
    }

    // Get the next event from queue
    const nextEvent = this.queuedEvents.shift()!
    
    // Update display state
    this.currentDisplayState = {
      currentPhase: nextEvent.phase,
      phaseMessage: nextEvent.message,
      phaseData: nextEvent.data,
      progress: nextEvent.progress,
      canAdvance: this.queuedEvents.length > 0
    }

    // Mark when this phase started
    this.currentPhaseStartTime = Date.now()

    console.log('✨ Display Controller: Advanced to phase', nextEvent.phase, `(${this.queuedEvents.length} queued)`)
    
    // Notify the UI component
    this.onStateChange(this.currentDisplayState)

    // If we have more events queued, schedule the next advancement
    if (this.queuedEvents.length > 0) {
      this.scheduleAdvancement()
    }
  }

  /**
   * Schedule advancement to next phase after minimum display time
   */
  private scheduleAdvancement() {
    if (this.advanceTimer) return // Already scheduled

    const timeInCurrentPhase = Date.now() - this.currentPhaseStartTime
    const remainingTime = Math.max(0, this.minDisplayTime - timeInCurrentPhase)

    this.advanceTimer = setTimeout(() => {
      this.advanceTimer = null
      if (this.canAdvanceToNextPhase()) {
        this.advanceToNextPhase()
      }
    }, remainingTime)

    console.log('⏰ Display Controller: Scheduled advancement in', remainingTime, 'ms')
  }

  /**
   * Get current display state
   */
  getCurrentState(): DisplayState {
    return this.currentDisplayState
  }

  /**
   * Force advance (for testing or emergency cases)
   */
  forceAdvance() {
    if (this.queuedEvents.length > 0) {
      this.advanceToNextPhase()
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer)
      this.advanceTimer = null
    }
    this.queuedEvents = []
  }
}