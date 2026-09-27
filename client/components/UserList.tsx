"use client";

interface Props {
  users: any[];
  onSelect: (user: any) => void;
}

export default function UserList({
  users,
  onSelect,
}: Props) {
  return (
    <div className="w-full md:w-80 border-r border-slate-200 bg-white overflow-y-auto">
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold p-3 sm:p-4 text-slate-900 border-b border-slate-200">
        Users
      </h1>

      <div className="divide-y divide-slate-200">
        {users.map((user) => (
          <button
            key={user._id}
            onClick={() => onSelect(user)}
            className="w-full text-left p-3 sm:p-4 cursor-pointer hover:bg-blue-50 transition-all duration-200 text-sm sm:text-base text-slate-900 hover:text-blue-600 font-medium"
          >
            {user.name}
          </button>
        ))}
      </div>
    </div>
  );
}