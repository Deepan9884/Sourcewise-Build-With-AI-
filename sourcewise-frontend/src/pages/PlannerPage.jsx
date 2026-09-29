import { useState, useEffect } from 'react'
import { Clock, CheckCircle2, Loader2, Calendar, Trash2, Award, RefreshCw } from 'lucide-react'
import { GlowCard } from '../components/ui/glow-card'
import EmptyState from '../components/ui/empty-state'
import { useSourceStore } from '../store/sourceStore'
import { useAuthStore } from '../store/authStore'
import { sendAgentMessage } from '../lib/agentApi'
import { sendToOrchestrator } from '../lib/orchestratorApi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function PlannerPage() {
  const { activeSourceIds } = useSourceStore()
  const { user, accessToken } = useAuthStore()
  
  const [plans, setPlans] = useState([])
  const [currentPlan, setCurrentPlan] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [planError, setPlanError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [examDate, setExamDate] = useState('')
  const [subject, setSubject] = useState('')
  const [dailyHours, setDailyHours] = useState(2)
  const [milestoneAlert, setMilestoneAlert] = useState(null)

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/planner`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPlans(data || [])
        if (data && data.length > 0) {
          const latest = data[0]
          setCurrentPlan(latest.data ? JSON.parse(latest.data) : latest)
          if (latest.data) {
            const parsed = JSON.parse(latest.data)
            if (parsed.days?.length > 0) setSelectedDay(parsed.days[0])
          }
        }
      }
    } catch (err) {
      console.error('[Planner] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlans()
  }, [])

  const generatePlan = async () => {
    setIsGenerating(true)
    setPlanError(null)
    try {
      const dateText = examDate || '1 week from now'
      const subjectText = subject || 'my study material'
      
      // Use orchestrator for structured plan generation
      const response = await sendToOrchestrator({
        message: `Create a study plan for ${subjectText}. My exam is ${dateText}. I can study ${dailyHours} hours per day.`,
        sourceIds: activeSourceIds,
        userId: user?.id || 'anonymous',
        action: 'generate',
        topic: subjectText,
        examDate: dateText,
        dailyHours: dailyHours,
      })
      
      let parsed = null
      if (response.data?.plan) {
        parsed = response.data.plan
      } else if (response.data?.StudyPlannerAgent?.plan) {
        parsed = response.data.StudyPlannerAgent.plan
      } else if (response.message) {
        parsed = parsePlanFromText(response.message)
      }
      
      if (parsed) {
        setCurrentPlan(parsed)
        if (parsed.days?.length > 0) setSelectedDay(parsed.days[0])

        // Save to backend
        await savePlan(parsed)
      } else {
        throw new Error('The AI returned an empty plan. Try again with a clearer subject and exam date.');
      }
    } catch (error) {
      console.error('Plan generation failed:', error)
      // Fallback to agent API
      try {
        const response = await sendAgentMessage({
          message: `Create a study plan for ${subject}. My exam is ${examDate || '1 week from now'}. I can study ${dailyHours} hours per day. Include daily topics, study activities, and time estimates for each activity.`,
          sourceIds: activeSourceIds,
          history: [],
        })
        
        let parsed = null
        if (response.data && typeof response.data === 'object') {
          parsed = response.data.plan ? parsePlanFromText(response.data.plan) : response.data
        } else if (response.message) {
          parsed = parsePlanFromText(response.message)
        }
        
        if (parsed) {
          setCurrentPlan(parsed)
          if (parsed.days?.length > 0) setSelectedDay(parsed.days[0])
          await savePlan(parsed)
        } else {
          setPlanError('The AI returned an empty plan. Try again with a clearer subject and exam date.')
        }
      } catch (fallbackError) {
        console.error('Fallback plan generation also failed:', fallbackError)
        setPlanError(fallbackError.message || 'Plan generation failed. Check that the API (port 4000) and AI service (port 8000) are running, then try again.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const savePlan = async (planData) => {
    try {
      const res = await fetch(`${API_URL}/planner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: planData.title || 'Study Plan',
          subject: subject || 'General',
          exam_date: examDate || '',
          daily_hours: dailyHours,
          data: JSON.stringify(planData),
          source_ids: activeSourceIds,
        }),
      })
      if (res.ok) {
        await fetchPlans()
      }
    } catch (err) {
      console.error('[Planner] Save error:', err)
    }
  }

  const deletePlan = async (planId) => {
    try {
      await fetch(`${API_URL}/planner/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      await fetchPlans()
    } catch (err) {
      console.error('[Planner] Delete error:', err)
    }
  }

  const toggleDayStatus = async (dayIndex) => {
    if (!currentPlan || !currentPlan.days) return
    
    const updatedDays = [...currentPlan.days]
    const day = updatedDays[dayIndex]
    const wasCompleted = day.status === 'completed'
    day.status = wasCompleted ? 'pending' : 'completed'
    
    const updatedPlan = { ...currentPlan, days: updatedDays }
    setCurrentPlan(updatedPlan)
    setSelectedDay(day)
    
    // Save updated plan using the new endpoint
    if (currentPlan.id && !wasCompleted) {
      try {
        const res = await fetch(`${API_URL}/planner/${currentPlan.id}/complete-day`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ day_index: dayIndex }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.newMilestones?.length > 0) {
            setMilestoneAlert(data.newMilestones[0])
            setTimeout(() => setMilestoneAlert(null), 5000)
          }
        }
      } catch (err) {
        console.error('[Planner] Update error:', err)
      }
    } else {
      // Just save locally for uncompleting
      try {
        await fetch(`${API_URL}/planner/${currentPlan.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ data: JSON.stringify(updatedPlan) }),
        })
      } catch (err) {
        console.error('[Planner] Update error:', err)
      }
    }
  }

  const handleReplan = async (dayIndex) => {
    if (!currentPlan?.id) return
    try {
      const res = await fetch(`${API_URL}/planner/${currentPlan.id}/replan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ missed_day_index: dayIndex, reason: 'user_requested' }),
      })
      if (res.ok) {
        const data = await res.json()
        const planData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data
        setCurrentPlan(planData)
        if (planData.days?.length > 0) setSelectedDay(planData.days[dayIndex])
      }
    } catch (err) {
      console.error('[Planner] Replan error:', err)
    }
  }

  const parsePlanFromText = (text) => {
    const lines = text.split('\n')
    const days = []
    let currentDay = null
    let title = 'Study Plan'

    for (const line of lines) {
      const dayMatch = line.match(/^#+?\s*(?:Day \d+|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)
      if (dayMatch || line.match(/^(?:Day \d+|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)) {
        if (currentDay) days.push(currentDay)
        const dayName = line.match(/(Day \d+|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)?.[0] || `Day ${days.length + 1}`
        currentDay = { name: dayName, topics: [], activities: [], duration: '2 hours', status: 'pending' }
        continue
      }

      if (currentDay) {
        const topicMatch = line.match(/^[-*]\s*(?:Topic|Focus|Study)[:\s]*(.+)/i)
        if (topicMatch) {
          currentDay.topics.push(topicMatch[1].trim())
          continue
        }
        
        const activityMatch = line.match(/^[-*]\s*(?:Activity|Task|Do)[:\s]*(.+)/i)
        if (activityMatch) {
          currentDay.activities.push(activityMatch[1].trim())
          continue
        }

        if (line.trim() && !line.startsWith('#')) {
          currentDay.topics.push(line.trim().replace(/^[-*]\s*/, ''))
        }
      }
    }

    if (currentDay) days.push(currentDay)
    if (days.length === 0) {
      days.push({ name: 'Day 1', topics: ['Review material'], activities: ['Study'], duration: '2 hours', status: 'pending' })
    }

    return { title, days: days.slice(0, 7) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8845F]"></div>
      </div>
    )
  }

  if (!currentPlan) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-[28px] font-display font-bold text-[#1E1B16] tracking-tight">Study Planner</h1>
          <p className="text-[15px] text-[#5B544E] mt-1">Generate a personalized study plan from your uploaded sources.</p>
        </motion.div>

        <GlowCard className="p-8 sm:p-10 text-center" glowColor="amber" intensity="md">
          <EmptyState title="No study plan yet" copy="Tell your fox companion your subject and exam date — it will build a day-by-day schedule from your sources." />

          <div className="max-w-md mx-auto space-y-4 mt-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject name (e.g., Biology)"
              className="sw-input"
            />
            <input
              type="text"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              placeholder="Exam date (e.g., next Friday)"
              className="sw-input"
            />
            <div>
              <label className="block text-sm font-medium text-[#1E1B16] mb-1">Daily study hours</label>
              <input
                type="range"
                min="1"
                max="8"
                value={dailyHours}
                onChange={(e) => setDailyHours(parseInt(e.target.value))}
                className="sw-range w-full"
                style={{ '--sw-range-fill': `${(dailyHours - 1) / 7 * 100}%` }}
              />
              <div className="flex justify-between text-xs text-[#8A817B] mt-1">
                <span>1h</span>
                <span className="font-semibold text-[#C05A35]">{dailyHours}h per day</span>
                <span>8h</span>
              </div>
            </div>
          </div>

          <button
            onClick={generatePlan}
            disabled={isGenerating}
            className="sw-btn-primary mx-auto mt-6"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            <span>{isGenerating ? 'Generating...' : 'Generate Study Plan'}</span>
          </button>
          {planError && (
            <div className="max-w-md mx-auto mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 text-left">
              {planError}
            </div>
          )}
        </GlowCard>

        {plans.length > 0 && (
          <GlowCard className="p-6" glowColor="amber" intensity="sm">
            <h3 className="text-lg font-display font-semibold text-[#1E1B16] mb-4">Previous Plans</h3>
            <div className="space-y-2">
              {plans.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-xl border border-[#EDE7E1]">
                  <span className="text-sm text-[#1E1B16]">{p.title || 'Untitled Plan'}</span>
                  <button
                    onClick={() => deletePlan(p.id)}
                    className="p-1 text-[#8A817B] hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </GlowCard>
        )}
      </div>
    )
  }

  const completedDays = currentPlan.days?.filter(d => d.status === 'completed').length || 0
  const totalDays = currentPlan.days?.length || 1
  const progress = Math.round((completedDays / totalDays) * 100)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Milestone Alert */}
      {milestoneAlert && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-[#FDEEE6]/60 border border-[rgba(232,132,95,0.35)] rounded-xl p-4 flex items-center space-x-3"
        >
          <Award className="w-6 h-6 text-[#E8845F]" />
          <div>
            <p className="font-semibold text-[#1E1B16]">Milestone Achieved!</p>
            <p className="text-sm text-[#5B544E]">{milestoneAlert.label}</p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-display font-bold text-[#1E1B16] tracking-tight">{currentPlan.title || 'Study Plan'}</h1>
          <p className="text-[15px] text-[#5B544E] mt-1">{completedDays} of {totalDays} days completed ({progress}%)</p>
        </div>
        <button
          onClick={() => { setCurrentPlan(null); setSelectedDay(null) }}
          className="sw-btn-secondary !h-10 !text-[13px]"
        >
          Create New Plan
        </button>
      </motion.div>

      {/* Progress Bar */}
      <GlowCard className="p-4" glowColor="amber" intensity="sm">
        <div className="h-2.5 bg-[#F1ECE6] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#E8845F] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {currentPlan.milestones?.length > 0 && (
          <div className="flex items-center space-x-3 mt-3">
            {currentPlan.milestones.map((m, idx) => (
              <div key={idx} className="flex items-center space-x-1 text-xs text-[#C05A35]">
                <Award className="w-3 h-3" />
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </GlowCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Days List */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-lg font-display font-semibold text-[#1E1B16] mb-3">Schedule</h3>
          {currentPlan.days?.map((day, idx) => {
            const isSelected = selectedDay === day
            const isCompleted = day.status === 'completed'
            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-[#E8845F] bg-[rgba(232,132,95,0.08)]'
                    : isCompleted
                      ? 'border-[rgba(15,118,110,0.35)] bg-[#E0F2F0]/40'
                      : 'border-[#EDE7E1] hover:border-[rgba(232,132,95,0.4)] bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-[#1E1B16] ${isCompleted ? 'text-[#0F766E] line-through' : ''}`}>{day.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleDayStatus(idx) }}
                    className={`p-1 rounded-full ${
                      isCompleted ? 'bg-[#E0F2F0] text-[#0F766E]' : 'bg-[#F1ECE6] text-[#8A817B]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[#8A817B] mt-1">{day.topics?.length || 0} topics • {day.duration}</p>
              </button>
            )
          })}
        </div>

        {/* Day Detail */}
        <div className="lg:col-span-2">
          {selectedDay ? (
            <GlowCard className="p-6" glowColor="amber" intensity="sm">
              <h3 className="text-lg font-display font-semibold text-[#1E1B16] mb-4">{selectedDay.name}</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-[#1E1B16] mb-2">Topics</h4>
                  <div className="space-y-2">
                    {selectedDay.topics?.map((topic, idx) => (
                      <div key={idx} className="flex items-center space-x-2 p-2 bg-[#FAFAFA] border border-[#EDE7E1] rounded-xl">
                        <span className="text-[#E8845F]">•</span>
                        <span className="text-sm text-[#5B544E]">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedDay.activities?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-[#1E1B16] mb-2">Activities</h4>
                    <div className="space-y-2">
                      {selectedDay.activities.map((activity, idx) => (
                        <div key={idx} className="flex items-center space-x-2 p-2 bg-[#FAFAFA] border border-[#EDE7E1] rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-[#E8845F]" />
                          <span className="text-sm text-[#5B544E]">{activity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 text-sm text-[#8A817B]">
                  <Clock className="w-4 h-4" />
                  <span>Estimated: {selectedDay.duration}</span>
                </div>

                {selectedDay.status !== 'completed' && (
                  <button
                    onClick={() => handleReplan(currentPlan.days?.indexOf(selectedDay))}
                    className="sw-btn-secondary !h-9 !px-3 !text-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Replan from here</span>
                  </button>
                )}
              </div>
            </GlowCard>
          ) : (
            <GlowCard className="p-6" glowColor="amber" intensity="sm">
              <EmptyState compact title="Select a day" copy="Pick a day from your schedule to see topics and activities." />
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  )
}
