export default function CalendarSyncBanner({ status, onConnect, onSync }) {
  if (status?.connected) {
    return (
      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs">
        <span>📅</span>
        <span className="text-emerald-900 font-semibold">Calendar connected</span>
        {status.lastSync && <span className="text-emerald-700">· synced {new Date(status.lastSync).toLocaleString()}</span>}
        <button onClick={onSync} className="ml-auto font-bold text-emerald-800 hover:underline">Sync now</button>
      </div>
    )
  }
  return (
    <div className="p-3 rounded-2xl bg-[#FAF6F2] border border-[#EDE7E1] flex items-center gap-2 text-xs">
      <span>📅</span>
      <span className="text-[#5B544E]">Connect Google Calendar to auto-avoid conflicts.</span>
      <button onClick={onConnect} className="ml-auto font-bold text-[#C05A35] hover:underline">Connect</button>
    </div>
  )
}
