"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: events, isLoading, error } = trpc.events.list.useQuery({});
  const [user, setUser] = useState<{ displayName: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">💃</span>
              <span className="text-xl font-bold text-gray-900">ActiMeet</span>
            </Link>
            <nav className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/messages" className="text-gray-600 hover:text-gray-900 font-medium">
                    Messages
                  </Link>
                  <Link href="/my-tickets" className="text-gray-600 hover:text-gray-900 font-medium">
                    My Tickets
                  </Link>
                  <Link href="/profile" className="text-gray-600 hover:text-gray-900 font-medium">
                    {user.displayName}
                  </Link>
                  <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700 text-sm">
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                    Log in
                  </Link>
                  <Link href="/signup" className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-full font-medium transition">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Connect through<span className="text-rose-500"> activities</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Meet amazing people while learning something new. Dance, play sports, explore hobbies — and find your spark along the way.
          </p>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Upcoming Events</h2>

          {isLoading && <p className="text-gray-500">Loading events...</p>}
          {error && <p className="text-red-500">Failed to load events. Is the API running?</p>}

          {events && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition group">
                  <div className="h-48 bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center">
                    <span className="text-6xl">
                      {event.category === "dance" && "💃"}
                      {event.category === "sports" && "🎾"}
                      {event.category === "music" && "🎸"}
                      {event.category === "hobbies" && "🎨"}
                      {event.category === "wellness" && "🧘"}
                    </span>
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-medium uppercase tracking-wide text-rose-500">{event.activityType}</span>
                    <h3 className="text-lg font-semibold text-gray-900 mt-1 group-hover:text-rose-500 transition">{event.title}</h3>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.shortDescription}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-lg font-bold">€{(event.priceCents / 100).toFixed(0)}</span>
                      <span className="text-sm text-gray-500">{event.venueCity}</span>
                    </div>
                    {event.genderMode === "mixed" && (
                      <div className="flex gap-3 text-sm mt-2">
                        <span className="text-blue-600">♂ {(event.maleCapacity ?? 0) - (event.maleTicketsSold ?? 0)} left</span>
                        <span className="text-pink-600">♀ {(event.femaleCapacity ?? 0) - (event.femaleTicketsSold ?? 0)} left</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto text-center">
          <p>© 2026 ActiMeet. Made with ❤️ in Ireland.</p>
        </div>
      </footer>
    </div>
  );
}
