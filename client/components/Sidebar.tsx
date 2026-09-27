export default function Sidebar() {
  return (
    <div className="w-72 md:w-80 bg-white border-r border-slate-200 h-screen p-3 sm:p-4 overflow-y-auto hidden md:flex md:flex-col shadow-sm">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-slate-900">
        Chats
      </h1>

      <div className="space-y-2 sm:space-y-3">
        <div className="p-3 sm:p-4 rounded-xl bg-blue-50 hover:bg-blue-100 cursor-pointer text-slate-900 text-sm sm:text-base font-medium transition-all duration-200">
          John Doe
        </div>
      </div>
    </div>
  );
}