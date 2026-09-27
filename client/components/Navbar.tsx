export default function Navbar() {
  return (
    <div className="h-14 sm:h-16 bg-linear-to-r from-white to-slate-50 border-b border-slate-200 flex items-center px-3 sm:px-5 justify-between shadow-sm">
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
        Chat App
      </h1>

      <button className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-base font-semibold transition-all duration-200">
        Logout
      </button>
    </div>
  );
}