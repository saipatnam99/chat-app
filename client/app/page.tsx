import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-linear-to-br from-slate-50 to-blue-50">
      <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 text-center text-slate-900">
        Welcome to Communication - App 
      </h1>

      <p className="text-sm sm:text-base text-slate-600 text-center mb-8 max-w-md">
        Connect with others instantly. Real-time messaging made simple.
      </p>

      <Link
        href="/login"
        className="bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold transition-all duration-200 hover:shadow-lg"
      >
        Start Chatting →
      </Link>
    </div>
  );
}
