import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, Clock, Target, BookOpen, Award, Brain,
  Calendar, CheckCircle2, AlertCircle, Flame, BarChart3
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { GlowCard } from '../components/ui/glow-card'
import { StudyProgressRing } from '../components/ui/study-progress-ring'

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app'

export default function ProgressCenterPage() {
  const { accessToken } = useAuthStore()
  const [analytics, setAnalytics] = useState(null)
  const [reviews, setReviews] = useState([])
  const [revisionStats, setRevisionStats] = useState(null)
  const [masteryData, setMasteryData] = useState([])
  const [trends, setTrends] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProgressData = async () => {
    try {
      const headers = { Authorization: `Bearer ${accessToken}` }

      const [analyticsRes, reviewsRes, revisionStatsRes, masteryRes, trendsRes] = await Promise.allSettled([
        fetch(`${API_URL}/analytics/overview`, { headers }),
        fetch(`${API_URL}/revision/today`, { headers }),
        fetch(`${API_URL}/progress/revision-stats`, { headers }),
        fetch(`${API_URL}/mastery`, { headers }),
        fetch(`${API_URL}/progress/trends`, { headers }),
      ])

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
        setAnalytics(await analyticsRes.value.json())
      }
      if (reviewsRes.status === 'fulfilled' && reviewsRes.value.ok) {
        setReviews(await reviewsRes.value.json())
      }
      if (revisionStatsRes.status === 'fulfilled' && revisionStatsRes.value.ok) {
        setRevisionStats(await revisionStatsRes.value.json())
      }
      if (masteryRes.status === 'fulfilled' && masteryRes.value.ok) {
        setMasteryData(await masteryRes.value.json())
      }
      if (trendsRes.status === 'fulfilled' && trendsRes.value.ok) {
        setTrends(await trendsRes.value.json())
      }
    } catch (err) {
      console.error('[ProgressCenter] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteReview = async (concept, score) => {
    try {
      await fetch(`${API_URL}/revision/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ concept, score }),
      })
      fetchProgressData()
    } catch (err) {
      console.error('[ProgressCenter] Complete review error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8845F]"></div>
      </div>
    )
  }

  const statBadges = ['sw-icon-badge-coral', 'sw-icon-badge-teal', 'sw-icon-badge-amber']

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[28px] font-display font-bold text-[#1E1B16] tracking-tight">Progress Center</h1>
        <p className="text-[15px] text-[#5B544E] mt-1">Track your learning journey and review schedule.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Flame, label: 'Study Streak', value: `${analytics?.streak || 0} days` },
          { icon: Target, label: 'Quiz Accuracy', value: `${analytics?.quizAccuracy || 0}%` },
          { icon: BookOpen, label: 'Topics Mastered', value: `${analytics?.topicsMastered || 0}/${analytics?.topicsTotal || 0}` },
          { icon: Clock, label: 'Study Hours', value: `${analytics?.studyHours || 0}h` },
        ].map((stat, idx) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
            <GlowCard className="p-5 text-center" glowColor="amber" intensity="sm">
              <div className={`sw-icon-badge ${statBadges[idx % 3]} mb-3`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-[30px] leading-none font-extrabold tabular-nums text-[#1E1B16]">{stat.value}</p>
              <p className="text-[13px] font-medium text-[#6B625C] mt-1.5">{stat.label}</p>
            </GlowCard>
          </motion.div>
        ))}
      </div>

      {/* Revision Stats */}
      {revisionStats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlowCard className="p-6" glowColor="amber" intensity="sm">
            <h2 className="text-lg font-display font-semibold text-[#1E1B16] mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#E8845F]" />
              <span>Revision Status</span>
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-semibold text-[#1E1B16]">{revisionStats.dueToday}</p>
                <p className="text-xs text-[#8A817B]">Due Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-[#1E1B16]">{revisionStats.upcoming}</p>
                <p className="text-xs text-[#8A817B]">Upcoming</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-[#1E1B16]">{revisionStats.totalReviews}</p>
                <p className="text-xs text-[#8A817B]">Total Reviews</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-[#1E1B16]">{revisionStats.retentionRate}%</p>
                <p className="text-xs text-[#8A817B]">Retention</p>
              </div>
            </div>
          </GlowCard>
        </motion.div>
      )}

      {/* Learning Profile */}
      {masteryData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <GlowCard className="p-6" glowColor="amber" intensity="sm">
            <h2 className="text-lg font-display font-semibold text-[#1E1B16] mb-4 flex items-center space-x-2">
              <Brain className="w-5 h-5 text-[#E8845F]" />
              <span>Learning Profile</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Mastered', count: masteryData.filter(m => m.level === 'mastery').length, color: 'text-[#0F766E]' },
                { label: 'Proficient', count: masteryData.filter(m => m.level === 'proficient').length, color: 'text-[#1E1B16]' },
                { label: 'Developing', count: masteryData.filter(m => m.level === 'developing').length, color: 'text-[#D97706]' },
                { label: 'Novice', count: masteryData.filter(m => m.level === 'novice').length, color: 'text-[#8A817B]' },
              ].map((item, idx) => (
                <div key={idx} className="text-center p-3 bg-[#FAFAFA] border border-[#EDE7E1] rounded-xl">
                  <p className={`text-xl font-bold ${item.color}`}>{item.count}</p>
                  <p className="text-xs text-[#8A817B]">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {masteryData.slice(0, 5).map((m, idx) => (
                <div key={idx} className="flex items-center space-x-3">
                  <span className="text-sm text-[#1E1B16] w-32 truncate">{m.concept}</span>
                  <div className="flex-1 h-2 bg-[#F1ECE6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E8845F] rounded-full"
                      style={{ width: `${m.mastery_score}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-[#8A817B] w-10 text-right">{m.mastery_score}%</span>
                </div>
              ))}
            </div>
          </GlowCard>
        </motion.div>
      )}

      {/* Learning Trends - Simple Text Display */}
      {trends?.snapshots?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlowCard className="p-6" glowColor="amber" intensity="sm">
            <h2 className="text-lg font-display font-semibold text-[#1E1B16] mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#E8845F]" />
              <span>Learning Trends</span>
              {trends.trends && (
                <div className="flex items-center space-x-2 ml-auto">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    trends.trends.quiz === 'improving' ? 'bg-[#E0F2F0] text-[#0F766E]' :
                    trends.trends.quiz === 'declining' ? 'bg-red-100 text-red-600' :
                    'bg-[#F1ECE6] text-[#6B625C]'
                  }`}>
                    Quiz: {trends.trends.quiz}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    trends.trends.mastery === 'improving' ? 'bg-[#E0F2F0] text-[#0F766E]' :
                    trends.trends.mastery === 'declining' ? 'bg-red-100 text-red-600' :
                    'bg-[#F1ECE6] text-[#6B625C]'
                  }`}>
                    Mastery: {trends.trends.mastery}
                  </span>
                </div>
              )}
            </h2>
            <div className="space-y-2">
              {trends.snapshots.slice(-5).map((snap, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-[#FAFAFA] rounded-lg">
                  <span className="text-sm text-[#1E1B16]">{snap.snapshot_date || `Snapshot ${idx + 1}`}</span>
                  <div className="flex items-center space-x-4 text-xs text-[#8A817B]">
                    <span>Quiz: {snap.quiz_accuracy || 0}%</span>
                    <span>Mastered: {snap.topics_mastered || 0}</span>
                    <span>Hours: {snap.study_hours || 0}h</span>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Ring */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlowCard className="p-6" glowColor="amber" intensity="sm">
            <h2 className="text-lg font-display font-semibold text-[#1E1B16] mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#E8845F]" />
              <span>Overall Progress</span>
            </h2>
            <div className="flex items-center justify-center py-4">
              <StudyProgressRing
                progress={analytics?.masteryPercentage || 0}
                size={160}
                strokeWidth={12}
                label="Mastery"
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div>
                <p className="font-bold text-[#1E1B16]">{analytics?.knowledgeGaps || 0}</p>
                <p className="text-xs text-[#8A817B]">Knowledge Gaps</p>
              </div>
              <div>
                <p className="font-bold text-[#1E1B16]">{analytics?.learningVelocity || 0}</p>
                <p className="text-xs text-[#8A817B]">New This Week</p>
              </div>
              <div>
                <p className="font-bold text-[#1E1B16]">{analytics?.totalQuizzes || 0}</p>
                <p className="text-xs text-[#8A817B]">Quizzes Taken</p>
              </div>
            </div>
          </GlowCard>
        </motion.div>

        {/* Today's Reviews */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlowCard className="p-6" glowColor="amber" intensity="sm">
            <h2 className="text-lg font-display font-semibold text-[#1E1B16] mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#E8845F]" />
              <span>Today's Reviews</span>
            </h2>
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-sm text-[#8A817B] text-center py-4">No reviews due today. Great job!</p>
              ) : (
                reviews.slice(0, 5).map((review, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-xl border border-[#EDE7E1]">
                    <div className="flex items-center space-x-3">
                      <Target className="w-4 h-4 text-[#E8845F]" />
                      <span className="text-sm font-medium text-[#1E1B16]">{review.concept}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCompleteReview(review.concept, 95)}
                        className="px-3 py-1 text-xs bg-[#E0F2F0] text-[#0F766E] rounded-lg"
                      >
                        Got it
                      </button>
                      <button
                        onClick={() => handleCompleteReview(review.concept, 50)}
                        className="px-3 py-1 text-xs bg-[#FDEEE6] text-[#C05A35] rounded-lg"
                      >
                        Review again
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlowCard>
        </motion.div>

        {/* Subject Performance - Simple List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
          <GlowCard className="p-6" glowColor="amber" intensity="sm">
            <h2 className="text-lg font-display font-semibold text-[#1E1B16] mb-4 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-[#E8845F]" />
              <span>Subject Performance</span>
            </h2>
            {analytics?.subjectPerformance?.length > 0 ? (
              <div className="space-y-3">
                {analytics.subjectPerformance.slice(0, 6).map((subj, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-lg">
                    <span className="text-sm font-medium text-[#1E1B16]">{subj.concept}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 h-2 bg-[#F1ECE6] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#E8845F] rounded-full"
                          style={{ width: `${subj.accuracy || 0}%` }}
                        />
                      </div>
                      <span className="text-sm tabular-nums text-[#8A817B] w-12 text-right">{subj.accuracy || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#8A817B] text-center py-4">No subject data yet. Take some quizzes!</p>
            )}
            {analytics.topicsTotal > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-[#E0F2F0] rounded-xl">
                  <p className="text-2xl font-bold text-[#0F766E]">{analytics.topicsMastered || 0}</p>
                  <p className="text-xs text-[#8A817B]">Mastered</p>
                </div>
                <div className="p-3 bg-[#FEF3E2] rounded-xl">
                  <p className="text-2xl font-bold text-[#D97706]">
                    {Math.max(0, (analytics.topicsTotal || 0) - (analytics.topicsMastered || 0) - (analytics.knowledgeGaps || 0))}
                  </p>
                  <p className="text-xs text-[#8A817B]">In Progress</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <p className="text-2xl font-bold text-red-600">{analytics.knowledgeGaps || 0}</p>
                  <p className="text-xs text-[#8A817B]">Gaps</p>
                </div>
              </div>
            )}
          </GlowCard>
        </motion.div>

        {/* Weak Topics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <GlowCard className="p-6" glowColor="amber" intensity="sm">
            <h2 className="text-lg font-display font-semibold text-[#1E1B16] mb-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-[#E8845F]" />
              <span>Weak Topics</span>
            </h2>
            <div className="space-y-2">
              {analytics?.weakTopics?.length > 0 ? (
                analytics.weakTopics.map((topic, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-2 bg-[#FAFAFA] rounded-lg border border-[#EDE7E1]">
                    <AlertCircle className="w-4 h-4 text-[#E8845F]" />
                    <span className="text-sm text-[#1E1B16]">{topic}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#8A817B] text-center py-4">No weak topics identified yet.</p>
              )}
            </div>
          </GlowCard>
        </motion.div>

        {/* Recommendations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <GlowCard className="p-6" glowColor="amber" intensity="sm">
            <h2 className="text-lg font-display font-semibold text-[#1E1B16] mb-4 flex items-center space-x-2">
              <Award className="w-5 h-5 text-[#E8845F]" />
              <span>Recommendations</span>
            </h2>
            <div className="space-y-2">
              {analytics?.recommendations?.length > 0 ? (
                analytics.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E8845F] mt-0.5" />
                    <span className="text-sm text-[#1E1B16]">{rec.title || rec}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#8A817B] text-center py-4">Keep studying to get personalized recommendations!</p>
              )}
            </div>
          </GlowCard>
        </motion.div>
      </div>
    </div>
  )
}
