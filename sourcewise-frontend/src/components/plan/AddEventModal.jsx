import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { addStudentEvent } from '../../lib/studentEvents';

const CATEGORIES = [
  'Hackathon',
  'Workshop',
  'Symposium',
  'Conference',
  'Competition',
  'Paper Presentation',
  'Exam',
  'Seminar',
  'Webinar',
  'Project Deadline',
  'Other'
];

const MODES = ['In-Person', 'Online', 'Hybrid'];

export default function AddEventModal({ isOpen, onClose, initialDate, onEventAdded }) {
  if (!isOpen) return null;
  return <AddEventModalContent onClose={onClose} initialDate={initialDate} onEventAdded={onEventAdded} />;
}

function AddEventModalContent({ onClose, initialDate, onEventAdded }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hackathon');
  const [mode, setMode] = useState('In-Person');
  const [startDate, setStartDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an event title');
      return;
    }
    if (!startDate) {
      setError('Please select a start date');
      return;
    }
    if (endDate && endDate < startDate) {
      setError('End date cannot be earlier than start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const newEvent = addStudentEvent({
        title: title.trim(),
        category,
        mode,
        startDate,
        endDate: endDate || undefined,
        venue: venue.trim(),
        organizer: organizer.trim(),
        projectDescription: description.trim(),
        keyLearnings: description.trim(),
        role: 'Participant',
        outcome: 'Scheduled / Upcoming',
        rating: 5
      });

      if (onEventAdded) {
        onEventAdded(newEvent);
      }
      onClose();
    } catch (err) {
      console.error('Error adding event:', err);
      setError('Failed to save event. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1E1B16]/50 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#EDE7E1] overflow-hidden my-auto z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F1ECE6] bg-[#FDFAF8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-700 shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1E1B16] leading-tight">
                  Add Event to Calendar
                </h3>
                <p className="text-xs text-[#8A817B] mt-0.5">
                  Synchronizes automatically with My Plan and Event Portfolio
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A817B] hover:text-[#1E1B16] hover:bg-[#F1ECE6] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-[#5B544E] mb-1.5 uppercase tracking-wide">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Smart India Hackathon, ML Workshop, Midterm Exam"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E7DCCB] rounded-xl text-sm text-[#1E1B16] placeholder:text-[#A89F91] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-medium"
              />
            </div>

            {/* Category & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#5B544E] mb-1.5 uppercase tracking-wide">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E7DCCB] rounded-xl text-sm text-[#1E1B16] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5B544E] mb-1.5 uppercase tracking-wide">
                  Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E7DCCB] rounded-xl text-sm text-[#1E1B16] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
                >
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#5B544E] mb-1.5 uppercase tracking-wide">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E7DCCB] rounded-xl text-sm text-[#1E1B16] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5B544E] mb-1.5 uppercase tracking-wide">
                  End Date <span className="text-[#A89F91] font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E7DCCB] rounded-xl text-sm text-[#1E1B16] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
                />
              </div>
            </div>

            {/* Venue & Organizer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#5B544E] mb-1.5 uppercase tracking-wide">
                  Venue / Location
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Auditorium 2 / Zoom"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E7DCCB] rounded-xl text-sm text-[#1E1B16] placeholder:text-[#A89F91] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5B544E] mb-1.5 uppercase tracking-wide">
                  Organizer
                </label>
                <input
                  type="text"
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  placeholder="e.g. GDG, IEEE, College Dept"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E7DCCB] rounded-xl text-sm text-[#1E1B16] placeholder:text-[#A89F91] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#5B544E] mb-1.5 uppercase tracking-wide">
                Description / Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key goals, agenda, prerequisites, or topics to prepare..."
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#E7DCCB] rounded-xl text-sm text-[#1E1B16] placeholder:text-[#A89F91] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 resize-none font-medium"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#F1ECE6]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5B544E] hover:bg-[#F1ECE6] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-teal text-white hover:bg-teal-hover text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Adding…' : 'Add to Calendar'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
