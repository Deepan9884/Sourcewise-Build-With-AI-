import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  UploadCloud,
  FileText,
  Calendar,
  Check,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Plus,
  Loader2,
  Feather,
  Clock,
  Layers,
  FileCheck
} from 'lucide-react'
import ParchmentTexture from '../primitives/ParchmentTexture'
import WaxSeal from '../primitives/WaxSeal'
import AmbientGlow from '../primitives/AmbientGlow'
import { subjectStyle } from '../utils/subjectPalette'
import { useAuthStore } from '../../../store/authStore'
import { useSourceStore } from '../../../store/sourceStore'
import { ingestDocument } from '../../../lib/chatApi'
import { readFilePayload } from '../../../lib/fileReader'

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app'

const STEPS = [
  { id: 1, title: 'Subject Name', hint: 'The course or topic to master', icon: BookOpen },
  { id: 2, title: 'Upload Files', hint: 'Syllabus, notes, PDFs, or materials', icon: UploadCloud },
  { id: 3, title: 'Grand Exam Date', hint: 'Final target exam milestone', icon: Calendar },
  { id: 4, title: 'Side Exams', hint: 'Midterms, quizzes & unit tests', icon: Layers },
]

const QUICK_SUBJECTS = ['Computer Science', 'Data Structures', 'Organic Chemistry', 'Calculus', 'Biology', 'Microeconomics', 'Physics']

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function getTomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * PlanCreationWizard — Strictly ordered sequential study plan creator:
 * 1. Subject Name
 * 2. Files to Upload
 * 3. Grand Exam Date
 * 4. Any other side exams
 *
 * No manual mood swing entry required — AI automatically predicts it.
 */
export default function PlanCreationWizard({ onComplete, isGenerating = false }) {
  const { user, accessToken } = useAuthStore()
  const { addSource, updateSourceStatus } = useSourceStore()

  const [step, setStep] = useState(1)

  // Step 1: Subject Name
  const [subjectName, setSubjectName] = useState('')

  // Step 2: Files
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Step 3: Grand Exam Date
  const [grandExamDate, setGrandExamDate] = useState('')

  // Step 4: Side Exams
  const [sideExams, setSideExams] = useState([])

  const [error, setError] = useState('')

  // Helper calculation for grand exam countdown
  const daysUntilGrandExam = useMemo(() => {
    if (!grandExamDate) return null
    const diff = new Date(`${grandExamDate}T00:00:00Z`).getTime() - new Date().setHours(0, 0, 0, 0)
    return Math.max(0, Math.round(diff / (24 * 3600 * 1000)))
  }, [grandExamDate])

  // File Upload Handler
  const handleFilesChosen = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setIsUploading(true)
    setError('')

    const newFiles = Array.from(fileList)

    for (const file of newFiles) {
      const sourceId = `src_${Date.now()}_${Math.random().toString(36).substring(7)}`
      const stagedItem = {
        id: sourceId,
        backendId: null,
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop().toLowerCase(),
        status: 'uploading',
        chunks: 0,
        file,
      }

      setFiles((prev) => [...prev, stagedItem])

      // Add to global sourceStore
      addSource({
        id: sourceId,
        name: file.name,
        size: file.size,
        type: stagedItem.type,
        status: 'uploading',
        file,
      })

      try {
        updateSourceStatus(sourceId, 'processing')

        // 1. Ingest into Python AI (vectorize)
        let ingestRes = { chunks_indexed: 0 }
        try {
          ingestRes = await ingestDocument(file, sourceId, user?.id || 'anonymous', file.name)
        } catch (aiErr) {
          console.warn('[PlanWizard] Python AI ingest skipped/offline:', aiErr.message)
        }

        // 2. Register metadata with Node API
        let backendId = null
        if (accessToken) {
          try {
            const payload = await readFilePayload(file)
            const res = await fetch(`${API_URL}/sources`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                name: file.name,
                type: stagedItem.type,
                size: file.size,
                status: 'ready',
                chunks_count: ingestRes?.chunks_indexed || 0,
                chunks_indexed: ingestRes?.chunks_indexed || 0,
                file_base64: payload.file_base64,
                text_content: payload.text_content,
                mime_type: payload.mime_type,
              }),
            })
            if (res.ok) {
              const data = await res.json()
              backendId = data.id
            }
          } catch (apiErr) {
            console.warn('[PlanWizard] Node API source save skipped:', apiErr.message)
          }
        }

        updateSourceStatus(sourceId, 'ready')
        setFiles((prev) =>
          prev.map((f) =>
            f.id === sourceId
              ? {
                  ...f,
                  status: 'ready',
                  backendId,
                  chunks: ingestRes?.chunks_indexed || 0,
                }
              : f
          )
        )
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) => (f.id === sourceId ? { ...f, status: 'staged' } : f))
        )
      }
    }

    setIsUploading(false)
  }

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // Side Exams helpers
  const addSideExam = () => {
    setSideExams((prev) => [
      ...prev,
      {
        id: `side_${Date.now()}`,
        name: '',
        date: grandExamDate ? addDaysISO(-14) : '',
        type: 'Midterm',
      },
    ])
  }

  const updateSideExam = (id, patch) => {
    setSideExams((prev) => prev.map((se) => (se.id === id ? { ...se, ...patch } : se)))
  }

  const removeSideExam = (id) => {
    setSideExams((prev) => prev.filter((se) => se.id !== id))
  }

  // Validation per step
  const canProceed = () => {
    if (step === 1) return subjectName.trim().length >= 2
    if (step === 2) return true // Files optional or can continue
    if (step === 3) return Boolean(grandExamDate)
    if (step === 4) return true
    return false
  }

  const handleNext = () => {
    if (!canProceed()) return
    setError('')
    setStep((s) => Math.min(4, s + 1))
  }

  // Finish and compile payload
  const handleFinalSubmit = () => {
    if (!subjectName.trim()) {
      setError('Please provide a subject name.')
      setStep(1)
      return
    }
    if (!grandExamDate) {
      setError('Please set the grand exam date.')
      setStep(3)
      return
    }

    const validSourceIds = files
      .map((f) => f.backendId)
      .filter((id) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))

    const cleanSideExams = sideExams
      .filter((se) => se.name.trim() && se.date)
      .map((se) => ({
        name: se.name.trim(),
        date: se.date,
        type: se.type || 'Midterm',
      }))

    const today = new Date().toISOString().slice(0, 10)

    const payload = {
      name: `${subjectName.trim()} Master Plan`,
      exam_period_start: today,
      exam_period_end: grandExamDate,
      daily_study_budget_minutes: 120,
      subjects: [
        {
          subject_name: subjectName.trim(),
          exam_date: grandExamDate,
          source_ids: validSourceIds,
          exam_weight: 1.5,
          current_mastery: 0,
          target_mastery: 80,
          difficulty_estimate: 'medium',
        },
      ],
      side_exams: cleanSideExams,
      plan_data: {
        side_exams: cleanSideExams,
        grand_exam_date: grandExamDate,
        materials_count: files.length,
      },
    }

    onComplete(payload)
  }

  const st = subjectStyle(subjectName || 'Study')

  return (
    <ParchmentTexture intensity="normal" className="shadow-sm">
      <AmbientGlow position="top-right" size="md" tint="amber" />
      <div className="relative p-6 sm:p-8">
        {/* Step Indicator Bar */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {STEPS.map((s) => {
            const isDone = step > s.id
            const isActive = step === s.id
            const Icon = s.icon
            return (
              <div key={s.id} className="flex flex-col">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center transition-all ${
                      isDone
                        ? 'bg-teal text-white'
                        : isActive
                        ? 'bg-[#1E1B16] text-white'
                        : 'bg-[#EDE7E1] text-[#8A817B]'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.id}
                  </span>
                  <span
                    className={`text-xs font-bold hidden sm:inline truncate ${
                      isActive ? 'text-[#1E1B16]' : 'text-[#8A817B]'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-[#EFE7DD] overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#E8845F] to-[#D97706] rounded-full"
                    initial={false}
                    animate={{ width: isDone || isActive ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: SUBJECT NAME */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 max-w-xl"
            >
              <div>
                <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-[#C05A35] mb-1">
                  Step 1 of 4 · Core Subject
                </span>
                <h2 className="text-2xl font-display font-bold text-[#1E1B16]">
                  What subject are you preparing for?
                </h2>
                <p className="text-sm text-[#5B544E] mt-1">
                  Enter your course or subject name. The AI organizes all study sessions, milestones, and topics around it.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B625C] mb-1.5">
                  Subject Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canProceed() && handleNext()}
                    placeholder="e.g. Computer Networks, Organic Chemistry, Linear Algebra..."
                    className="sw-input text-base py-3 pl-4 pr-10 w-full"
                  />
                  {subjectName.trim().length >= 2 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-teal">
                      <Check className="w-5 h-5" />
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Preset Topics */}
              <div>
                <span className="block text-[11px] font-bold text-[#8A817B] mb-2">
                  Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUBJECTS.map((qs) => (
                    <button
                      key={qs}
                      type="button"
                      onClick={() => setSubjectName(qs)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        subjectName === qs
                          ? 'bg-[#1E1B16] text-white border-[#1E1B16]'
                          : 'bg-white/80 border-[#E7DCCB] text-[#5B544E] hover:border-[#C05A35]'
                      }`}
                    >
                      {qs}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: FILES TO UPLOAD */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 max-w-2xl"
            >
              <div>
                <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-[#C05A35] mb-1">
                  Step 2 of 4 · Study Material
                </span>
                <h2 className="text-2xl font-display font-bold text-[#1E1B16]">
                  Upload files for {subjectName || 'your subject'}
                </h2>
                <p className="text-sm text-[#5B544E] mt-1">
                  Attach syllabus, textbook chapters, lecture slides, or notes. The AI automatically chunks and indexes them for targeted RAG tutoring.
                </p>
              </div>

              {/* Dropzone Container */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleFilesChosen(e.dataTransfer.files)
                }}
                className="p-6 border-2 border-dashed border-[#D9CEBF] hover:border-[#C05A35] rounded-2xl bg-white/60 hover:bg-white/90 transition-all cursor-pointer text-center group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={(e) => handleFilesChosen(e.target.files)}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-[#FAF6F2] group-hover:bg-amber-50 text-[#C05A35] mx-auto flex items-center justify-center transition-colors shadow-xs mb-2.5">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>
                <p className="text-sm font-bold text-[#1E1B16]">
                  {isUploading ? 'Ingesting and vectorizing materials…' : 'Click or drag files here to upload'}
                </p>
                <p className="text-xs text-[#8A817B] mt-0.5">
                  Supports PDF, Word (DOCX), Markdown, and TXT notes
                </p>
              </div>

              {/* Uploaded Files List */}
              {files.length > 0 && (
                <div className="space-y-2 mt-3">
                  <span className="text-xs font-bold text-[#6B625C] block">
                    Attached Materials ({files.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 rounded-xl bg-white/90 border border-[#E7DCCB] flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#1E1B16] truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] text-[#8A817B]">
                              {formatBytes(file.size)}
                              {file.status === 'ready' && ' · Indexed'}
                              {file.status === 'uploading' && ' · Indexing…'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="p-1.5 text-[#8A817B] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {files.length === 0 && !isUploading && (
                <p className="text-xs text-[#8A817B] italic">
                  Don’t have files handy right now? You can skip this step and upload them later in the Knowledge Hub.
                </p>
              )}
            </motion.div>
          )}

          {/* STEP 3: GRAND EXAM DATE */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 max-w-xl"
            >
              <div>
                <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-[#C05A35] mb-1">
                  Step 3 of 4 · Final Milestone
                </span>
                <h2 className="text-2xl font-display font-bold text-[#1E1B16]">
                  When is your Grand Exam for {subjectName}?
                </h2>
                <p className="text-sm text-[#5B544E] mt-1">
                  Specify the date of your main, final exam. The AI calculates review intervals and mastery checkpoints leading up to this day.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B625C] mb-1.5">
                  Grand Exam Date
                </label>
                <input
                  type="date"
                  min={getTomorrowISO()}
                  value={grandExamDate}
                  onChange={(e) => setGrandExamDate(e.target.value)}
                  className="sw-input text-base py-3 px-4 w-full"
                />
              </div>

              {/* Quick Date Presets */}
              <div>
                <span className="block text-[11px] font-bold text-[#8A817B] mb-2">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '+2 Weeks', days: 14 },
                    { label: '+1 Month', days: 30 },
                    { label: '+2 Months', days: 60 },
                    { label: '+3 Months (Finals)', days: 90 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setGrandExamDate(addDaysISO(preset.days))}
                      className="text-xs px-3 py-1.5 rounded-xl border border-[#E7DCCB] bg-white/80 text-[#5B544E] hover:border-[#C05A35] font-semibold transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Countdown Preview */}
              {grandExamDate && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-white border border-amber-300 text-amber-700 flex items-center justify-center font-mono font-extrabold text-sm shadow-2xs">
                      {daysUntilGrandExam}d
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#1E1B16]">
                        {daysUntilGrandExam} days until Grand Exam
                      </p>
                      <p className="text-xs text-[#5B544E]">
                        Targeting 80%+ mastery with interleaved review cycles
                      </p>
                    </div>
                  </div>
                  <Calendar className="w-5 h-5 text-amber-700/60" />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 4: ANY OTHER SIDE EXAMS */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 max-w-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-[#C05A35] mb-1">
                    Step 4 of 4 · Intermediate Milestones
                  </span>
                  <h2 className="text-2xl font-display font-bold text-[#1E1B16]">
                    Any other side exams or midterms?
                  </h2>
                  <p className="text-sm text-[#5B544E] mt-1">
                    Add upcoming unit tests, midterms, quizzes, or mock exams before the grand exam.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSideExam}
                  className="sw-btn-secondary !h-9 !text-xs font-bold text-[#C05A35] flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Side Exam
                </button>
              </div>

              {/* Side Exams List */}
              {sideExams.length > 0 ? (
                <div className="space-y-3">
                  {sideExams.map((se, i) => (
                    <div
                      key={se.id}
                      className="p-3.5 rounded-2xl bg-white/80 border border-[#E7DCCB] shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#6B625C] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#C05A35]" />
                          Side Exam #{i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSideExam(se.id)}
                          className="text-[#8A817B] hover:text-red-600 p-1 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-6">
                          <label className="text-[10px] font-bold uppercase text-[#8A817B] block mb-1">
                            Exam Title
                          </label>
                          <input
                            type="text"
                            value={se.name}
                            onChange={(e) => updateSideExam(se.id, { name: e.target.value })}
                            placeholder="e.g. Midterm 1, Unit Test 2..."
                            className="sw-input text-xs w-full"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold uppercase text-[#8A817B] block mb-1">
                            Type
                          </label>
                          <select
                            value={se.type}
                            onChange={(e) => updateSideExam(se.id, { type: e.target.value })}
                            className="sw-input text-xs w-full"
                          >
                            <option value="Midterm">Midterm</option>
                            <option value="Unit Test">Unit Test</option>
                            <option value="Quiz">Quiz</option>
                            <option value="Mock Exam">Mock Exam</option>
                          </select>
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold uppercase text-[#8A817B] block mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            max={grandExamDate || undefined}
                            value={se.date}
                            onChange={(e) => updateSideExam(se.id, { date: e.target.value })}
                            className="sw-input text-xs w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/60 border border-[#E7DCCB] text-center space-y-2">
                  <p className="text-xs text-[#5B544E]">
                    No side exams? That’s totally fine — your timetable will focus 100% on preparing you for the Grand Exam.
                  </p>
                  <button
                    type="button"
                    onClick={addSideExam}
                    className="text-xs font-bold text-[#C05A35] hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Click here to add a midterm or quiz
                  </button>
                </div>
              )}

              {/* Summary Codex Card before Seal */}
              <div className="p-4 rounded-2xl bg-white/90 border border-[#E7DCCB] space-y-2 mt-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#8A817B]">
                    Codex Inscription Summary
                  </span>
                  <span className="text-xs font-mono font-bold text-teal">
                    AI Timetable Ready
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#F5EFEA]">
                  <div>
                    <span className="text-[10px] text-[#8A817B] block">Subject</span>
                    <span className="text-xs font-bold text-[#1E1B16] truncate block">{subjectName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A817B] block">Study Files</span>
                    <span className="text-xs font-bold text-[#1E1B16]">{files.length} attached</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A817B] block">Grand Exam</span>
                    <span className="text-xs font-bold text-[#1E1B16]">{grandExamDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A817B] block">Side Exams</span>
                    <span className="text-xs font-bold text-[#1E1B16]">{sideExams.length} milestones</span>
                  </div>
                </div>
              </div>

              {/* Seal Button Action */}
              <div className="pt-2 flex items-center gap-4">
                <WaxSeal
                  color="coral"
                  size="lg"
                  onPress={handleFinalSubmit}
                  disabled={isGenerating || !subjectName.trim() || !grandExamDate}
                  label="Inscribe Study Codex"
                >
                  {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Feather className="w-6 h-6" />}
                </WaxSeal>
                <div>
                  <p className="text-sm font-bold text-[#1E1B16]">
                    {isGenerating ? 'Inscribing your AI Study Timetable…' : 'Press the seal to generate your plan'}
                  </p>
                  <p className="text-xs text-[#5B544E]">
                    Interleaves study sessions, side exam prep & review milestones · AI mood predicted
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="mt-4 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#EFE7DD]">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="sw-btn-secondary !h-10 !text-[13px] disabled:opacity-30"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="sw-btn-primary !h-10 !text-[13px] disabled:opacity-40"
            >
              {step === 2 && files.length === 0 ? 'Skip / Continue' : 'Continue'}{' '}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isGenerating || !subjectName.trim() || !grandExamDate}
              className="sw-btn-primary !h-10 !text-[13px] disabled:opacity-40"
            >
              {isGenerating ? 'Inscribing…' : 'Generate AI Study Plan'} <Calendar className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </ParchmentTexture>
  )
}
