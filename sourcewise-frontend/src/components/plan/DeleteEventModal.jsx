import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  Calendar,
  Search,
  CheckCircle2
} from 'lucide-react';
import { deleteStudentEvent, getCategoryStyle } from '../../lib/studentEvents';

export default function DeleteEventModal({ isOpen, onClose, events = [], onDeleteSuccess }) {
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletedToast, setDeletedToast] = useState(null);

  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase().trim();
    return events.filter((e) => {
      if (!q) return true;
      return (
        e.title?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.startDate?.includes(q) ||
        e.venue?.toLowerCase().includes(q) ||
        e.organizer?.toLowerCase().includes(q)
      );
    });
  }, [events, search]);

  if (!isOpen) return null;

  const handleDelete = (id, title) => {
    try {
      deleteStudentEvent(id);
      setConfirmDeleteId(null);
      setDeletedToast(`Deleted "${title}"`);
      setTimeout(() => setDeletedToast(null), 2500);
      if (onDeleteSuccess) {
        onDeleteSuccess(id);
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
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
          className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#EDE7E1] overflow-hidden my-auto z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F1ECE6] bg-[#FDFAF8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1E1B16] leading-tight">
                  Delete / Manage Events
                </h3>
                <p className="text-xs text-[#8A817B] mt-0.5">
                  Select an event to remove it from your calendar &amp; portfolio
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

          {/* Search bar & Notice */}
          <div className="p-4 border-b border-[#F1ECE6] bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8A817B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events by title, category, date..."
                className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-[#E7DCCB] rounded-xl text-xs sm:text-sm text-[#1E1B16] placeholder:text-[#A89F91] focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            {deletedToast && (
              <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{deletedToast}</span>
              </div>
            )}
          </div>

          {/* Events List */}
          <div className="p-4 max-h-[55vh] overflow-y-auto space-y-2.5">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="w-8 h-8 text-[#A89F91] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[#5B544E]">No events found</p>
                <p className="text-xs text-[#8A817B] mt-1">
                  {search ? 'Try adjusting your search keyword.' : 'You have not added any events yet.'}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const style = getCategoryStyle(event.category);
                const isConfirming = confirmDeleteId === event.id;

                return (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-xl border border-[#EDE7E1] hover:border-[#DACFC4] bg-[#FDFAF8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}
                        >
                          {event.category || 'Event'}
                        </span>
                        <span className="text-[11px] font-medium text-[#8A817B]">
                          📅 {event.startDate}
                          {event.endDate && event.endDate !== event.startDate
                            ? ` → ${event.endDate}`
                            : ''}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#1E1B16] truncate">
                        {event.title}
                      </p>
                      {(event.venue || event.organizer) && (
                        <p className="text-xs text-[#8A817B] truncate mt-0.5">
                          {event.venue && `📍 ${event.venue}`}
                          {event.venue && event.organizer && ' · '}
                          {event.organizer && `Organized by ${event.organizer}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isConfirming ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-xl">
                          <span className="text-[11px] font-bold text-rose-700 px-1.5">
                            Confirm?
                          </span>
                          <button
                            onClick={() => handleDelete(event.id, event.title)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-white hover:bg-rose-100 text-[#5B544E] text-xs font-medium rounded-lg transition-colors border border-rose-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(event.id)}
                          className="h-8 px-3 rounded-xl border border-rose-200/80 bg-rose-50/60 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                          title="Delete this event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#F1ECE6] bg-[#FDFAF8] flex items-center justify-between">
            <span className="text-xs text-[#8A817B]">
              Total: <strong>{events.length}</strong> event{events.length !== 1 ? 's' : ''} logged
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F1ECE6] text-[#5B544E] hover:bg-[#EDE7E1] transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
