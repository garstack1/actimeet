"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useEffect, useState } from "react";

const categories = [
  { value: "", label: "All", emoji: "✨" },
  { value: "dance", label: "Dance", emoji: "💃" },
  { value: "sports", label: "Sports", emoji: "🎾" },
  { value: "music", label: "Music", emoji: "🎸" },
  { value: "hobbies", label: "Hobbies", emoji: "🎨" },
  { value: "wellness", label: "Wellness", emoji: "🧘" },
];

const cities = ["All Cities", "Dublin", "Cork", "Galway", "Limerick", "Belfast", "Waterford"];

export default function Home() {
  const [user, setUser] = useState<{ displayName: string } | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const queryInput = {
    ...(debouncedSearch ? { query: debouncedSearch } : {}),
    ...(category ? { category: category as "dance" | "sports" | "music" | "hobbies" | "wellness" | "other" } : {}),
    ...(city ? { city } : {}),
  };

  const { data: events, isLoading, error } = trpc.events.list.useQuery(queryInput);

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
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Connect through<span className="text-rose-500"> activities</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Meet amazing people while learning something new
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-5 py-4 pl-12 border border-gray-200 rounded-full text-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none shadow-sm"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-4 px-4 bg-white border-y">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Category Pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-4 py-2 rounded-full font-medium flex items-center gap-2 transition ${
                    category === cat.value
                      ? "bg-rose-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* City Filter */}
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-full bg-white text-gray-700 focus:ring-2 focus:ring-rose-500 outline-none"
            >
              {cities.map((c) => (
                <option key={c} value={c === "All Cities" ? "" : c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Results Count */}
      <section className="py-4 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">
            {isLoading ? "Loading..." : `${events?.length || 0} events found`}
            {(search || category || city) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setCity("");
                }}
                className="ml-3 text-rose-500 hover:text-rose-600 text-sm font-medium"
              >
                Clear filters
              </button>
            )}
          </p>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {error && <p className="text-red-500">Failed to load events. Is the API running?</p>}

          {events && events.length === 0 && (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🔍</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600">Try adjusting your filters or search term</p>
            </div>
          )}

          {events && events.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition group">
                  <div className="h-40 bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center">
                    <span className="text-5xl">
                      {event.category === "dance" && "💃"}
                      {event.category === "sports" && "🎾"}
                      {event.category === "music" && "🎸"}
                      {event.category === "hobbies" && "🎨"}
                      {event.category === "wellness" && "🧘"}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-rose-500">{event.activityType}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500">{event.venueCity}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-rose-500 transition line-clamp-1">{event.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.shortDescription}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-bold">€{(event.priceCents / 100).toFixed(0)}</span>
                      {event.genderMode === "mixed" && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-blue-600">♂{(event.maleCapacity ?? 0) - (event.maleTicketsSold ?? 0)}</span>
                          <span className="text-pink-600">♀{(event.femaleCapacity ?? 0) - (event.femaleTicketsSold ?? 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p>© 2026 ActiMeet. Made with ❤️ in Ireland.</p>
        </div>
      </footer>
    </div>
  );
}
