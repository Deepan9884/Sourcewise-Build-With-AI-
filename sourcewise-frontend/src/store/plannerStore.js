import { create } from 'zustand'
import { moodApi, calendarApi, studyPlansApi, scheduleApi, subscribeToEvents } from '../lib/studyPlansApi'

export const usePlannerStore = create((set, get) => ({
  plans: [],
  currentPlan: null,
  subjects: [],
  schedule: [],
  todaySlots: [],
  moodState: null,
  calendarStatus: null,
  calendarEvents: [],
  conflicts: [],
  replans: [],
  notification: null,
  pacing: null,
  adaptiveResult: null,
  isAdapting: false,
  isLoading: false,
  isGenerating: false,
  isReplanning: false,
  error: '',
  currentView: 'spread',
  weekStart: new Date().toISOString().slice(0, 10),
  celebrating: false,

  setError: (error) => set({ error }),
  notify: (notification) => set({ notification }),
  clearNotification: () => set({ notification: null }),
  setView: (currentView) => set({ currentView }),
  setWeekStart: (weekStart) => set({ weekStart }),
  celebrate: () => {
    set({ celebrating: true })
    setTimeout(() => set({ celebrating: false }), 1200)
  },
  clearPlans: () => set({
    plans: [],
    currentPlan: null,
    subjects: [],
    schedule: [],
    todaySlots: [],
    pacing: null,
    replans: [],
    notification: null,
  }),

  fetchPlans: async () => {
    set({ isLoading: true, error: '' })
    try {
      const plans = await studyPlansApi.list()
      const current = get().currentPlan
      if (!plans || plans.length === 0) {
        set({
          plans: [],
          currentPlan: null,
          subjects: [],
          schedule: [],
          todaySlots: [],
          pacing: null,
          replans: [],
          isLoading: false,
        })
        return []
      }
      set({ plans, isLoading: false })
      if (!current || !plans.some(p => p.id === current.id)) {
        await get().loadPlan(plans[0].id).catch(() => {})
      }
      return plans
    } catch (e) {
      set({ error: e.message, isLoading: false })
      return []
    }
  },

  createPlan: async (payload) => {
    set({ isGenerating: true, error: '' })
    let plan = null
    try {
      plan = await studyPlansApi.create(payload)
      const gen = await studyPlansApi.generate(plan.id)
      const full = await studyPlansApi.get(plan.id)
      set({
        currentPlan: full, subjects: full.subjects || [],
        plans: [full, ...get().plans], isGenerating: false,
      })
      return { plan: full, gen }
    } catch (e) {
      // If the plan shell was created but scheduling failed, still open it
      // so the user can retry from the plan view instead of losing work.
      if (plan?.id) {
        try {
          const full = await studyPlansApi.get(plan.id)
          set({ currentPlan: full, subjects: full.subjects || [], plans: [full, ...get().plans] })
        } catch { /* ignore */ }
      }
      set({ error: e.message, isGenerating: false })
      throw e
    }
  },

  loadPlan: async (id) => {
    set({ isLoading: true, error: '' })
    try {
      const full = await studyPlansApi.get(id)
      const [sched, today, replans, pacing] = await Promise.all([
        studyPlansApi.schedule(id).catch(() => []),
        studyPlansApi.today(id).catch(() => ({ slots: [] })),
        studyPlansApi.replans(id).catch(() => []),
        studyPlansApi.pacing(id).catch(() => null),
      ])
      set({
        currentPlan: full, subjects: full.subjects || [], schedule: sched,
        todaySlots: today.slots || [], replans, pacing, isLoading: false,
      })
      return full
    } catch (e) {
      set({ error: e.message, isLoading: false })
      throw e
    }
  },

  refreshSchedule: async (from, to) => {
    const { currentPlan } = get()
    if (!currentPlan?.id) return
    const sched = await studyPlansApi.schedule(currentPlan.id, from, to)
    set({ schedule: sched })
  },

  fetchPacing: async () => {
    const { currentPlan } = get()
    if (!currentPlan?.id) return null
    try {
      const pacing = await studyPlansApi.pacing(currentPlan.id)
      set({ pacing })
      return pacing
    } catch { return null }
  },

  // Fully-adaptive mood adjustment (bounded server-side, undoable).
  adaptToMood: async (moodState) => {
    const { currentPlan } = get()
    if (!currentPlan?.id) return null
    set({ isAdapting: true })
    try {
      const result = await studyPlansApi.adaptive(currentPlan.id, moodState)
      set({ adaptiveResult: result, isAdapting: false })
      if (result.adjustedSlots > 0) {
        await get().loadPlan(currentPlan.id)
        set({
          notification: {
            kind: 'adaptive', title: 'Plan adapted to your mood',
            body: `Adjusted ${result.adjustedSlots} slots (${result.mood || 'mood'}).`,
            at: new Date().toISOString(), undoToken: result.undoToken,
          },
        })
      }
      return result
    } catch (e) {
      set({ isAdapting: false, error: e.message })
      throw e
    }
  },

  undoAdaptation: async (undoToken) => {
    const { currentPlan } = get()
    if (!currentPlan?.id || !undoToken) return null
    const result = await studyPlansApi.adaptiveUndo(currentPlan.id, undoToken)
    await get().loadPlan(currentPlan.id)
    set({ adaptiveResult: null, notification: null })
    return result
  },

  replan: async (trigger = 'manual', triggerData = {}) => {
    const { currentPlan } = get()
    if (!currentPlan?.id) return
    set({ isReplanning: true })
    try {
      const result = await studyPlansApi.replan(currentPlan.id, trigger, triggerData)
      await get().loadPlan(currentPlan.id)
      set({
        isReplanning: false,
        notification: { kind: 'replan', title: 'Plan updated', body: `Rescheduled ${result.inserted || 0} slots (${trigger}).`, at: new Date().toISOString() },
      })
      return result
    } catch (e) {
      set({ isReplanning: false, error: e.message })
      throw e
    }
  },

  completeSlot: async (slotId, payload = {}) => {
    await scheduleApi.complete(slotId, payload)
    get().celebrate()
    const { currentPlan } = get()
    if (currentPlan?.id) await get().loadPlan(currentPlan.id)
  },

  rescheduleSlot: async (slotId, payload) => {
    await scheduleApi.reschedule(slotId, payload)
    const { currentPlan } = get()
    if (currentPlan?.id) await get().loadPlan(currentPlan.id)
  },

  checkinMood: async (payload) => {
    await moodApi.checkin(payload)
    const moodState = await moodApi.current()
    set({ moodState })
    return moodState
  },

  fetchMood: async () => {
    try {
      const moodState = await moodApi.current()
      set({ moodState })
      return moodState
    } catch { /* ignore when tables missing */ return null }
  },

  fetchCalendarStatus: async () => {
    try {
      const calendarStatus = await calendarApi.status()
      set({ calendarStatus })
      return calendarStatus
    } catch { return null }
  },

  connectCalendar: async () => {
    const { authUrl } = await calendarApi.auth()
    window.location.href = authUrl
  },

  syncCalendar: async () => {
    await calendarApi.sync()
    const { currentPlan } = get()
    if (currentPlan?.id) {
      const today = new Date().toISOString().slice(0, 10)
      const sched = await studyPlansApi.schedule(currentPlan.id, today)
      const conflicts = await calendarApi.conflicts(
        sched.filter((s) => s.slot_type !== 'break').map((s) => ({ date: s.date, start_time: s.start_time, end_time: s.end_time }))
      )
      set({ conflicts: conflicts.conflicts || [] })
    }
    await get().fetchCalendarStatus()
  },

  subscribeToReplanEvents: () => subscribeToEvents((event) => {
    if (event?.type === 'replan') {
      set({ notification: { kind: 'replan', title: 'Plan auto-updated', body: 'Your schedule adapted to recent changes.', at: new Date().toISOString() } })
      const { currentPlan } = get()
      if (currentPlan?.id && event.data?.planId === currentPlan.id) get().loadPlan(currentPlan.id).catch(() => {})
    }
  }),
}))
