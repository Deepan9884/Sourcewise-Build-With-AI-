import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CalendarDays,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddEventModal from './AddEventModal';
import DeleteEventModal from './DeleteEventModal';
import { useStudentEvents } from '../../lib/studentEvents';

export default function CalendarActionMenu({
  variant = 'icon', // 'icon' | 'button' | 'pill'
  buttonClassName = '',
  selectedDate = null,
  onEventChanged = null
}) {
  const navigate = useNavigate();
  const { events } = useStudentEvents();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAdd = () => {
    setIsMenuOpen(false);
    setIsAddModalOpen(true);
  };

  const handleOpenDelete = () => {
    setIsMenuOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleEventAdded = (newEvent) => {
    showToast(`Added "${newEvent.title}" to calendar!`);
    if (onEventChanged) onEventChanged(newEvent);
  };

  const handleEventDeleted = (id) => {
    showToast('Event removed from calendar');
    if (onEventChanged) onEventChanged(id);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-[120] px-4 py-2.5 rounded-xl bg-[#1E1B16] text-white text-xs font-bold shadow-xl border border-white/10 flex items-center gap-2"
          >
            <span>✨</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button Triggers based on variant */}
      {variant === 'icon' && (
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={`relative w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/70 text-teal-700 hover:bg-teal-100 flex items-center justify-center transition-all cursor-pointer shadow-2xs group focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${buttonClassName}`}
          title="Calendar Actions: Tap to Add or Delete Event"
          aria-expanded={isMenuOpen}
        >
          <CalendarDays className="w-4 h-4 text-teal-700 group-hover:scale-110 transition-transform" />
          {events.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </button>
      )}

      {variant === 'button' && (
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={`h-8 px-3 rounded-full text-xs font-bold bg-[#F1ECE6] text-[#5B544E] hover:bg-[#EDE7E1] hover:text-[#1E1B16] border border-[#E7DCCB] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${buttonClassName}`}
          aria-expanded={isMenuOpen}
        >
          <CalendarDays className="w-3.5 h-3.5 text-teal" />
          <span>Events</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {variant === 'pill' && (
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={`px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-bold hover:bg-teal-100 flex items-center gap-2 transition-all cursor-pointer ${buttonClassName}`}
          aria-expanded={isMenuOpen}
        >
          <Calendar className="w-3.5 h-3.5 text-teal-600" />
          <span>Calendar Actions</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#EDE7E1] py-2 z-50 overflow-hidden"
          >
            <div className="px-3 py-1.5 border-b border-[#F1ECE6] mb-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A817B]">
                Calendar Options
              </p>
            </div>

            {/* Option 1: Add Event */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="w-full px-3.5 py-2.5 flex items-start gap-2.5 text-left hover:bg-[#FDFAF8] transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1E1B16] group-hover:text-teal transition-colors">
                  Add Event
                </p>
                <p className="text-[11px] text-[#8A817B] leading-tight mt-0.5">
                  Schedule a hackathon, exam, or deadline
                </p>
              </div>
            </button>

            {/* Option 2: Delete Event */}
            <button
              type="button"
              onClick={handleOpenDelete}
              className="w-full px-3.5 py-2.5 flex items-start gap-2.5 text-left hover:bg-rose-50/50 transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1E1B16] group-hover:text-rose-600 transition-colors">
                  Delete Event
                </p>
                <p className="text-[11px] text-[#8A817B] leading-tight mt-0.5">
                  Manage &amp; remove logged events ({events.length})
                </p>
              </div>
            </button>

            {/* Divider & Go to Events Portfolio */}
            <div className="my-1 border-t border-[#F1ECE6]" />

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/events');
              }}
              className="w-full px-3.5 py-2 flex items-center justify-between text-left text-xs font-semibold text-[#5B544E] hover:text-[#1E1B16] hover:bg-[#F1ECE6] transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Open Events Portfolio</span>
              </span>
              <ExternalLink className="w-3 h-3 text-[#A89F91]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialDate={selectedDate}
        onEventAdded={handleEventAdded}
      />

      {/* Delete Event Modal */}
      <DeleteEventModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        events={events}
        onDeleteSuccess={handleEventDeleted}
      />
    </div>
  );
}
