import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CalendarDays,
  Trophy,
  Award,
  Plus,
  Search,
  MapPin,
  Building,
  CheckCircle2,
  Trash2,
  Edit3,
  Code2,
  Laptop,
  Clock,
  ChevronRight,
  Download,
  Copy,
  Layers,
  Check,
  Globe
} from 'lucide-react';
import { INITIAL_EVENTS, useStudentEvents } from '../lib/studentEvents';

export { INITIAL_EVENTS };

export default function EventsPage() {
  const { events, addEvent, deleteEvent, updateEvent } = useStudentEvents();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMode] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'timeline'
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [copiedResumeId, setCopiedResumeId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const defaultFormData = {
    title: '',
    category: 'Hackathon',
    mode: 'In-Person',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    venue: '',
    organizer: '',
    role: 'Participant',
    outcome: 'Completed & Certified',
    prizeAward: '',
    projectName: '',
    projectDescription: '',
    techStack: [],
    teamMembers: '',
    keyLearnings: '',
    skillsGained: [],
    rating: 5,
    certificateUrl: '',
    projectRepoUrl: '',
    liveDemoUrl: '',
    socialPostUrl: '',
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [techInput, setTechInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [modalTab, setModalTab] = useState('overview'); // 'overview' | 'outcome' | 'project' | 'learnings'

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAddModal = () => {
    setEditingEventId(null);
    setFormData(defaultFormData);
    setModalTab('overview');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event) => {
    setEditingEventId(event.id);
    setFormData({
      ...event,
      techStack: event.techStack || [],
      skillsGained: event.skillsGained || []
    });
    setModalTab('overview');
    setIsModalOpen(true);
  };

  const handleAddTech = () => {
    if (techInput.trim() && !formData.techStack.includes(techInput.trim())) {
      setFormData(prev => ({
        ...prev,
        techStack: [...prev.techStack, techInput.trim()]
      }));
      setTechInput('');
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skillsGained.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skillsGained: [...prev.skillsGained, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate) {
      alert('Please fill in the Event Title and Start Date');
      return;
    }

    if (editingEventId) {
      // Edit existing
      updateEvent(editingEventId, formData);
      showToast('Event updated successfully');
      if (viewingEvent?.id === editingEventId) {
        setViewingEvent({ ...formData, id: editingEventId });
      }
    } else {
      // Create new
      addEvent(formData);
      showToast('New event logged to your portfolio & calendar!');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this event from your logbook?')) {
      deleteEvent(id);
      if (viewingEvent?.id === id) setViewingEvent(null);
      showToast('Event removed');
    }
  };

  const copyAsResumeBullet = (event) => {
    const year = event.startDate ? event.startDate.slice(0, 4) : '';
    const outcomeText = event.outcome ? `Result: ${event.outcome}` : '';
    const prizeText = event.prizeAward ? ` (${event.prizeAward})` : '';
    const projectText = event.projectName ? ` Built "${event.projectName}" - ${event.projectDescription || ''}` : '';
    const techText = event.techStack?.length ? ` Tech: ${event.techStack.join(', ')}.` : '';
    const learningsText = event.keyLearnings ? ` Gained expertise in: ${event.skillsGained?.join(', ') || 'technical execution'}.` : '';

    const bullet = `• ${event.title} (${year}): Participated as ${event.role} organized by ${event.organizer || 'Organizers'}. ${outcomeText}${prizeText}.${projectText}${techText}${learningsText}`;
    
    navigator.clipboard.writeText(bullet);
    setCopiedResumeId(event.id);
    showToast('Copied resume-ready bullet to clipboard!');
    setTimeout(() => setCopiedResumeId(null), 2500);
  };

  const exportAllEventsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SourceWise_Student_Events_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Events exported as JSON file');
  };

  // Filter & Sort Logic
  const filteredEvents = events.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      e.title.toLowerCase().includes(q) ||
      (e.organizer && e.organizer.toLowerCase().includes(q)) ||
      (e.venue && e.venue.toLowerCase().includes(q)) ||
      (e.projectName && e.projectName.toLowerCase().includes(q)) ||
      (e.skillsGained && e.skillsGained.some(s => s.toLowerCase().includes(q))) ||
      (e.techStack && e.techStack.some(t => t.toLowerCase().includes(q)));

    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    const matchesMode = selectedMode === 'All' || e.mode === selectedMode;

    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'hackathons'
        ? e.category === 'Hackathon'
        : activeTab === 'workshops'
        ? e.category === 'Workshop'
        : activeTab === 'symposiums'
        ? e.category === 'Symposium' || e.category === 'Conference'
        : e.outcome.toLowerCase().includes('winner') || e.outcome.toLowerCase().includes('runner') || e.outcome.toLowerCase().includes('prize');

    return matchesSearch && matchesCategory && matchesMode && matchesTab;
  }).sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(b.startDate || 0) - new Date(a.startDate || 0);
    }
    if (sortBy === 'date-asc') {
      return new Date(a.startDate || 0) - new Date(b.startDate || 0);
    }
    if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (sortBy === 'wins-first') {
      const aWin = a.outcome.includes('Winner') || a.outcome.includes('Runner') ? 1 : 0;
      const bWin = b.outcome.includes('Winner') || b.outcome.includes('Runner') ? 1 : 0;
      return bWin - aWin;
    }
    return 0;
  });

  // KPI Calculations
  const totalEventsCount = events.length;
  const winsCount = events.filter(e => e.outcome.includes('Winner') || e.outcome.includes('Runner') || e.outcome.includes('Special')).length;
  const workshopsCount = events.filter(e => e.category === 'Workshop' || e.category === 'Bootcamp').length;
  const hackathonsCount = events.filter(e => e.category === 'Hackathon').length;
  const totalSkillsCount = new Set(events.flatMap(e => e.skillsGained || [])).size;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C2520] p-4 sm:p-6 md:p-8 space-y-8 font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#1E1B16] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-stone-700 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-100/50 to-amber-100/30 rounded-full blur-3xl -z-0 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-3 py-1 text-xs font-semibold bg-[#D1FAE5] text-[#047857] rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                  <Award className="w-3.5 h-3.5 text-[#10B981]" />
                  Student Activity & Event Hub
                </span>
                <span className="text-xs text-stone-400 font-medium">
                  {totalEventsCount} Events Verified
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1B16] tracking-tight">
                Events & Extracurricular Portfolio
              </h1>
              <p className="text-sm text-stone-600 mt-1.5 max-w-2xl leading-relaxed">
                Log and curate every hackathon, symposium, hands-on workshop, paper presentation, and college fest you attended. Document your key takeaways, tech stack, and achievements.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={exportAllEventsJSON}
                className="inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs sm:text-sm px-4 py-2.5 rounded-2xl transition duration-150"
                title="Export all events as JSON backup"
              >
                <Download className="w-4 h-4 text-stone-500" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-2xl shadow-sm hover:shadow transition duration-150"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Log New Event</span>
              </button>
            </div>
          </div>
        </div>

        {/* Analytics KPI Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex items-center gap-4 transition hover:border-emerald-300">
            <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#047857] flex items-center justify-center shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Total Events</p>
              <h3 className="text-2xl font-bold text-[#1E1B16]">{totalEventsCount}</h3>
              <p className="text-[11px] text-stone-500">{hackathonsCount} Hackathons</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex items-center gap-4 transition hover:border-amber-300">
            <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Wins & Podiums</p>
              <h3 className="text-2xl font-bold text-[#1E1B16]">{winsCount}</h3>
              <p className="text-[11px] text-amber-600 font-medium">Recognitions earned</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex items-center gap-4 transition hover:border-sky-300">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Workshops & Labs</p>
              <h3 className="text-2xl font-bold text-[#1E1B16]">{workshopsCount}</h3>
              <p className="text-[11px] text-stone-500">Hands-on training</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex items-center gap-4 transition hover:border-purple-300">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Skills Documented</p>
              <h3 className="text-2xl font-bold text-[#1E1B16]">{totalSkillsCount}</h3>
              <p className="text-[11px] text-stone-500">For resume & LinkedIn</p>
            </div>
          </div>
        </div>

        {/* Filter, Search & View Controls */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF8F5] p-1.5 rounded-2xl text-xs font-medium border border-stone-200/60">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl transition ${
                  activeTab === 'all'
                    ? 'bg-white text-[#1E1B16] shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                All Events ({events.length})
              </button>
              <button
                onClick={() => setActiveTab('hackathons')}
                className={`px-3.5 py-1.5 rounded-xl transition ${
                  activeTab === 'hackathons'
                    ? 'bg-white text-[#1E1B16] shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Hackathons
              </button>
              <button
                onClick={() => setActiveTab('workshops')}
                className={`px-3.5 py-1.5 rounded-xl transition ${
                  activeTab === 'workshops'
                    ? 'bg-white text-[#1E1B16] shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Workshops
              </button>
              <button
                onClick={() => setActiveTab('symposiums')}
                className={`px-3.5 py-1.5 rounded-xl transition ${
                  activeTab === 'symposiums'
                    ? 'bg-white text-[#1E1B16] shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Symposiums
              </button>
              <button
                onClick={() => setActiveTab('wins')}
                className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 ${
                  activeTab === 'wins'
                    ? 'bg-white text-amber-700 shadow-xs font-bold'
                    : 'text-stone-500 hover:text-amber-700'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Wins / Accolades
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1.5 rounded-2xl text-xs font-medium border border-stone-200/60 self-start md:self-auto">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#1E1B16] shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Cards
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                  viewMode === 'timeline'
                    ? 'bg-white text-[#1E1B16] shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Timeline
              </button>
            </div>
          </div>

          {/* Search Bar & Dropdown Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by event, organizer, skill, project..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-stone-800"
              />
            </div>

            <div>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none text-stone-700"
              >
                <option value="All">All Categories</option>
                <option value="Hackathon">Hackathons</option>
                <option value="Workshop">Workshops</option>
                <option value="Symposium">Symposiums</option>
                <option value="Conference">Conferences</option>
                <option value="Paper Presentation">Paper Presentations</option>
                <option value="Competition">Competitions</option>
                <option value="Bootcamp">Bootcamps</option>
                <option value="Seminar">Seminars</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none text-stone-700"
              >
                <option value="date-desc">Newest Date First</option>
                <option value="date-asc">Oldest Date First</option>
                <option value="wins-first">Wins & Accolades First</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* EVENTS LIST / GRID */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-12 text-center max-w-md mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CalendarDays className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-stone-900">No events matched</h3>
            <p className="text-xs text-stone-500 mt-1 mb-6">
              Try adjusting your search filters or click below to log a new event you went to.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="bg-[#10B981] hover:bg-[#059669] text-white font-medium px-5 py-2.5 rounded-2xl text-xs shadow-sm"
            >
              Log An Event
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative"
              >
                <div className="space-y-4">
                  {/* Category Pill & Date */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                        event.category === 'Hackathon'
                          ? 'bg-purple-100 text-purple-800'
                          : event.category === 'Workshop'
                          ? 'bg-sky-100 text-sky-800'
                          : event.category === 'Symposium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {event.category} • {event.mode}
                    </span>

                    <span className="text-xs font-semibold text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {event.startDate}
                    </span>
                  </div>

                  {/* Title & Host Body */}
                  <div>
                    <h3 className="text-base font-extrabold text-[#1E1B16] group-hover:text-emerald-700 transition leading-snug">
                      {event.title}
                    </h3>
                    {event.organizer && (
                      <p className="text-xs text-stone-500 mt-1.5 flex items-center gap-1.5 font-medium">
                        <Building className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{event.organizer}</span>
                      </p>
                    )}
                    {event.venue && (
                      <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </p>
                    )}
                  </div>

                  {/* Outcome & Recognition Pill */}
                  <div>
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                        event.outcome.includes('Winner') || event.outcome.includes('1st')
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : event.outcome.includes('Runner')
                          ? 'bg-stone-100 text-stone-800 border border-stone-200'
                          : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{event.outcome}</span>
                      {event.prizeAward && (
                        <span className="text-[11px] font-normal text-stone-600 border-l border-stone-300 pl-1.5 ml-0.5">
                          {event.prizeAward}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Project Highlight (if entered) */}
                  {event.projectName && (
                    <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-stone-200/60 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-stone-800">
                        <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Project: {event.projectName}</span>
                      </div>
                      {event.projectDescription && (
                        <p className="text-stone-500 line-clamp-2 text-[11px] leading-relaxed">
                          {event.projectDescription}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Skills / Tech Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(event.skillsGained || []).slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-medium bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-lg"
                      >
                        {skill}
                      </span>
                    ))}
                    {(event.skillsGained || []).length > 3 && (
                      <span className="text-[11px] text-stone-400 font-medium px-1 py-0.5">
                        +{event.skillsGained.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setViewingEvent(event)}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    View Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      title="Copy resume-ready bullet point"
                      onClick={() => copyAsResumeBullet(event)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
                    >
                      {copiedResumeId === event.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      title="Edit Event"
                      onClick={() => handleOpenEditModal(event)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      title="Delete Event"
                      onClick={() => handleDelete(event.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Timeline View */
          <div className="relative border-l-2 border-emerald-200 ml-4 sm:ml-8 pl-6 space-y-8 py-2">
            {filteredEvents.map(event => (
              <div key={event.id} className="relative group">
                {/* Timeline Node Dot */}
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white shadow-xs group-hover:scale-125 transition" />

                <div className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-2xs hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {event.startDate}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">
                        {event.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyAsResumeBullet(event)}
                        className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium bg-stone-50 px-2.5 py-1 rounded-xl"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Resume Bullet
                      </button>
                      <button
                        onClick={() => setViewingEvent(event)}
                        className="text-xs text-emerald-700 font-bold hover:underline"
                      >
                        View Full Details
                      </button>
                    </div>
                  </div>

                  <div className="pt-3">
                    <h3 className="text-lg font-bold text-stone-900">{event.title}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {event.organizer} • {event.venue} • Role: {event.role}
                    </p>
                    <div className="mt-2 text-xs font-semibold text-emerald-800 inline-block bg-emerald-50 px-3 py-1 rounded-xl">
                      Outcome: {event.outcome} {event.prizeAward && `(${event.prizeAward})`}
                    </div>
                    {event.keyLearnings && (
                      <p className="text-xs text-stone-600 mt-2 bg-[#FAF8F5] p-3 rounded-2xl border border-stone-200/60">
                        <strong className="text-stone-800">Learnings:</strong> {event.keyLearnings}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: LOG / EDIT EVENT (EVERY DETAIL CAPTURED)            */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B16]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto border border-stone-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-extrabold text-[#1E1B16]">
                  {editingEventId ? 'Edit Event Details' : 'Log An Attended Event'}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Enter every detail about the event, what you built, what you learned, and verification links.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex items-center gap-1 pt-4 pb-2 border-b border-stone-100 overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalTab('overview')}
                className={`px-4 py-2 rounded-xl transition shrink-0 ${
                  modalTab === 'overview'
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                1. General Overview
              </button>
              <button
                type="button"
                onClick={() => setModalTab('outcome')}
                className={`px-4 py-2 rounded-xl transition shrink-0 ${
                  modalTab === 'outcome'
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                2. Role & Accolades
              </button>
              <button
                type="button"
                onClick={() => setModalTab('project')}
                className={`px-4 py-2 rounded-xl transition shrink-0 ${
                  modalTab === 'project'
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                3. Project & Tech
              </button>
              <button
                type="button"
                onClick={() => setModalTab('learnings')}
                className={`px-4 py-2 rounded-xl transition shrink-0 ${
                  modalTab === 'learnings'
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                4. Learnings & Proofs
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-6">
              {/* TAB 1: OVERVIEW */}
              {modalTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Event Name / Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Smart India Hackathon 2026, AWS Cloud Community Day"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Event Category</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      >
                        <option value="Hackathon">Hackathon</option>
                        <option value="Workshop">Hands-on Workshop / Lab</option>
                        <option value="Symposium">Technical Symposium</option>
                        <option value="Conference">Conference / Summit</option>
                        <option value="Paper Presentation">Paper Presentation</option>
                        <option value="Competition">Coding / Tech Competition</option>
                        <option value="Seminar">Seminar / Guest Lecture</option>
                        <option value="Bootcamp">Certification Bootcamp</option>
                        <option value="Fest">College / Cultural Fest</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Mode / Delivery</label>
                      <select
                        value={formData.mode}
                        onChange={e => setFormData({ ...formData, mode: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      >
                        <option value="In-Person">In-Person (On-Campus / Offline)</option>
                        <option value="Virtual / Online">Virtual / Online</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">End Date (Optional)</label>
                      <input
                        type="date"
                        value={formData.endDate || ''}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Organizing Body / Host</label>
                      <input
                        type="text"
                        placeholder="e.g. IEEE Student Chapter, IIT Madras, GDG"
                        value={formData.organizer || ''}
                        onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Venue / Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Auditorium, Anna University, Chennai"
                        value={formData.venue || ''}
                        onChange={e => setFormData({ ...formData, venue: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OUTCOME & ROLE */}
              {modalTab === 'outcome' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Your Role in Event</label>
                      <select
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      >
                        <option value="Participant">Participant</option>
                        <option value="Team Lead">Team Lead</option>
                        <option value="Solo Contestant">Solo Contestant</option>
                        <option value="Speaker / Presenter">Speaker / Presenter</option>
                        <option value="Organizer / Volunteer">Organizer / Volunteer</option>
                        <option value="Mentor / Judge">Mentor / Judge</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Outcome / Result</label>
                      <select
                        value={formData.outcome}
                        onChange={e => setFormData({ ...formData, outcome: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm font-semibold"
                      >
                        <option value="Winner (1st Place)">🏆 Winner (1st Place)</option>
                        <option value="1st Runner-Up">🥈 1st Runner-Up (2nd Place)</option>
                        <option value="2nd Runner-Up">🥉 2nd Runner-Up (3rd Place)</option>
                        <option value="Finalist / Top 10">⭐ Finalist / Top 10</option>
                        <option value="Special Mention">🎖️ Special Mention / Best Innovation</option>
                        <option value="Completed & Certified">📜 Completed & Certified</option>
                        <option value="Attended">✅ Attended</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-stone-700 block mb-1">Prize / Cash Grant / Trophy</label>
                      <input
                        type="text"
                        placeholder="e.g. 1st Prize Trophy + ₹25,000 Cash Grant + Cloud Credits"
                        value={formData.prizeAward || ''}
                        onChange={e => setFormData({ ...formData, prizeAward: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PROJECT & TECH STACK */}
              {modalTab === 'project' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Project / Topic Title</label>
                      <input
                        type="text"
                        placeholder="e.g. SourceWise AI Copilot"
                        value={formData.projectName || ''}
                        onChange={e => setFormData({ ...formData, projectName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Teammates / Collaborators</label>
                      <input
                        type="text"
                        placeholder="e.g. Deepan D., Priya K., Arun S."
                        value={formData.teamMembers || ''}
                        onChange={e => setFormData({ ...formData, teamMembers: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-stone-700 block mb-1">Project Abstract / Overview</label>
                      <textarea
                        rows={2}
                        placeholder="Describe the solution built, problem statement solved, and impact..."
                        value={formData.projectDescription || ''}
                        onChange={e => setFormData({ ...formData, projectDescription: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      />
                    </div>

                    {/* Tech Stack Tag Input */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-stone-700 block mb-1">
                        Technologies / Frameworks Used
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. React, FastAPI, Python, OpenCV (Press Enter)"
                          value={techInput}
                          onChange={e => setTechInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTech();
                            }
                          }}
                          className="flex-1 px-3.5 py-2 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleAddTech}
                          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-xs"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(formData.techStack || []).map((t, idx) => (
                          <span
                            key={idx}
                            className="bg-stone-100 text-stone-800 text-xs px-2.5 py-1 rounded-xl flex items-center gap-1 font-medium"
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  techStack: formData.techStack.filter((_, i) => i !== idx)
                                })
                              }
                              className="text-stone-400 hover:text-rose-600 font-bold ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: LEARNINGS & PROOFS */}
              {modalTab === 'learnings' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Key Takeaways & What You Learned
                    </label>
                    <textarea
                      rows={2}
                      placeholder="What insights or technical breakthroughs did you gain? What feedback was given by the judges?"
                      value={formData.keyLearnings || ''}
                      onChange={e => setFormData({ ...formData, keyLearnings: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                    />
                  </div>

                  {/* Skills Gained Tags */}
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Skills Gained / Demonstrated
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Pitching, RAG Optimization, Cloud Run (Press Enter)"
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                        className="flex-1 px-3.5 py-2 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-xs"
                      >
                        Add Skill
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(formData.skillsGained || []).map((s, idx) => (
                        <span
                          key={idx}
                          className="bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded-xl flex items-center gap-1 font-semibold"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                skillsGained: formData.skillsGained.filter((_, i) => i !== idx)
                              })
                            }
                            className="text-stone-400 hover:text-rose-600 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Verification Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Certificate URL / Drive Link</label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={formData.certificateUrl || ''}
                        onChange={e => setFormData({ ...formData, certificateUrl: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">GitHub / Code Repo URL</label>
                      <input
                        type="url"
                        placeholder="https://github.com/..."
                        value={formData.projectRepoUrl || ''}
                        onChange={e => setFormData({ ...formData, projectRepoUrl: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Live Demo / Slides URL</label>
                      <input
                        type="url"
                        placeholder="https://slides.com/..."
                        value={formData.liveDemoUrl || ''}
                        onChange={e => setFormData({ ...formData, liveDemoUrl: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">LinkedIn / Social Post</label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/..."
                        value={formData.socialPostUrl || ''}
                        onChange={e => setFormData({ ...formData, socialPostUrl: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-stone-200 rounded-2xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Navigation & Submit Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-stone-100">
                <div className="flex items-center gap-2">
                  {modalTab !== 'overview' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['overview', 'outcome', 'project', 'learnings'];
                        const prevIdx = tabs.indexOf(modalTab) - 1;
                        if (prevIdx >= 0) setModalTab(tabs[prevIdx]);
                      }}
                      className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-2xl text-xs font-semibold"
                    >
                      ← Previous
                    </button>
                  )}
                  {modalTab !== 'learnings' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['overview', 'outcome', 'project', 'learnings'];
                        const nextIdx = tabs.indexOf(modalTab) + 1;
                        if (nextIdx < tabs.length) setModalTab(tabs[nextIdx]);
                      }}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl text-xs font-semibold"
                    >
                      Next Step →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-2xl text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl text-xs shadow-sm transition"
                  >
                    {editingEventId ? 'Save Changes' : 'Save Event to Logbook'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIEW DETAILED EVENT PROFILE                        */}
      {/* ========================================================= */}
      {viewingEvent && (
        <div className="fixed inset-0 z-50 bg-[#1E1B16]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto border border-stone-200 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  {viewingEvent.category} • {viewingEvent.mode}
                </span>
                <h2 className="text-xl font-extrabold text-[#1E1B16] mt-2 leading-snug">
                  {viewingEvent.title}
                </h2>
                {viewingEvent.organizer && (
                  <p className="text-xs text-stone-500 mt-1 font-medium">
                    Organized by {viewingEvent.organizer}
                  </p>
                )}
              </div>
              <button
                onClick={() => setViewingEvent(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#FAF8F5] rounded-2xl border border-stone-200/60 text-xs">
              <div>
                <span className="text-stone-400 block text-[11px]">Date</span>
                <span className="font-bold text-stone-800">{viewingEvent.startDate}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Venue</span>
                <span className="font-bold text-stone-800 truncate block">{viewingEvent.venue || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Your Role</span>
                <span className="font-bold text-stone-800">{viewingEvent.role}</span>
              </div>
              <div className="col-span-2 sm:col-span-3 pt-2 border-t border-stone-200/60 flex items-center justify-between">
                <div>
                  <span className="text-stone-400 block text-[11px]">Outcome & Recognition</span>
                  <span className="font-extrabold text-emerald-800 text-sm">{viewingEvent.outcome}</span>
                  {viewingEvent.prizeAward && (
                    <span className="text-xs font-semibold text-amber-700 ml-2">
                      ({viewingEvent.prizeAward})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Project Details */}
            {viewingEvent.projectName && (
              <div className="space-y-1.5 text-xs">
                <span className="font-extrabold text-[#1E1B16] block text-sm">
                  Project: {viewingEvent.projectName}
                </span>
                {viewingEvent.projectDescription && (
                  <p className="text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
                    {viewingEvent.projectDescription}
                  </p>
                )}
                {viewingEvent.teamMembers && (
                  <p className="text-stone-500 font-medium text-[11px]">
                    Teammates: {viewingEvent.teamMembers}
                  </p>
                )}
              </div>
            )}

            {/* Tech Stack */}
            {viewingEvent.techStack && viewingEvent.techStack.length > 0 && (
              <div>
                <span className="text-xs font-bold text-stone-800 block mb-1.5">Tech Stack:</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingEvent.techStack.map((tech, i) => (
                    <span key={i} className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-xl font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Learnings */}
            {viewingEvent.keyLearnings && (
              <div className="space-y-1 text-xs">
                <span className="font-bold text-stone-800 block">Key Learnings & Takeaways:</span>
                <p className="text-stone-600 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 leading-relaxed">
                  {viewingEvent.keyLearnings}
                </p>
              </div>
            )}

            {/* Skills */}
            {viewingEvent.skillsGained && viewingEvent.skillsGained.length > 0 && (
              <div>
                <span className="text-xs font-bold text-stone-800 block mb-1.5">Demonstrated Skills:</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingEvent.skillsGained.map((skill, i) => (
                    <span key={i} className="text-xs bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links Bar */}
            <div className="flex flex-wrap gap-2 pt-2">
              {viewingEvent.certificateUrl && (
                <a
                  href={viewingEvent.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl font-bold text-xs transition"
                >
                  <Award className="w-3.5 h-3.5" /> Certificate Proof
                </a>
              )}
              {viewingEvent.projectRepoUrl && (
                <a
                  href={viewingEvent.projectRepoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs transition"
                >
                  <Code2 className="w-3.5 h-3.5" /> GitHub Repository
                </a>
              )}
              {viewingEvent.liveDemoUrl && (
                <a
                  href={viewingEvent.liveDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs transition"
                >
                  <Globe className="w-3.5 h-3.5" /> Live Demo
                </a>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => copyAsResumeBullet(viewingEvent)}
                className="text-xs text-stone-600 hover:text-stone-900 font-semibold flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4 text-stone-400" />
                Copy Resume Bullet
              </button>

              <button
                onClick={() => setViewingEvent(null)}
                className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
