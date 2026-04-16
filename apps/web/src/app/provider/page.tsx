"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

export default function ProviderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; displayName: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      if (u.role !== "provider" && u.role !== "admin") {
        router.push("/provider/apply");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  const { data: events, isLoading } = trpc.events.myEvents.useQuery(
    { status: "all" },
    { enabled: !!user && (user.role === "provider" || user.role === "admin") }
  );

  if (!user || (user.role !== "provider" && user.role !== "admin")) {
    return null;
  }

  const publishedEvents = events?.filter(e => e.isPublished && !e.isCancelled) || [];
  const draftEvents = events?.filter(e => !e.isPublished) || [];
  const totalTickets = events?.reduce((sum, e) => sum + (e.totalTicketsSold ?? 0), 0) || 0;
  const totalRevenue = events?.reduce((sum, e) => sum + ((e.totalTicketsSold ?? 0) * (e.priceCents ?? 0)), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">💃</span>
            <span className="text-xl font-bold text-gray-900">ActiMeet</span>
            <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-2">Provider</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm">View Site</Link>
            <Link href="/profile" className="text-gray-600 hover:text-gray-900">{user.displayName}</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
          <Link
            href="/provider/events/new"
            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-full font-medium transition"
          >
            + Create Event
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Published Events</p>
            <p className="text-3xl font-bold text-gray-900">{publishedEvents.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Draft Events</p>
            <p className="text-3xl font-bold text-gray-900">{draftEvents.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Tickets Sold</p>
            <p className="text-3xl font-bold text-gray-900">{totalTickets}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600">€{(totalRevenue / 100).toFixed(0)}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/provider/events" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <span className="text-3xl mb-2 block">📅</span>
            <h3 className="font-semibold text-gray-900">My Events</h3>
            <p className="text-gray-500 text-sm">Manage all your events</p>
          </Link>
          <Link href="/provider/venues" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <span className="text-3xl mb-2 block">📍</span>
            <h3 className="font-semibold text-gray-900">Venues</h3>
            <p className="text-gray-500 text-sm">Manage your venues</p>
          </Link>
          <Link href="/provider/payouts" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <span className="text-3xl mb-2 block">💰</span>
            <h3 className="font-semibold text-gray-900">Payouts</h3>
            <p className="text-gray-500 text-sm">View earnings & payouts</p>
          </Link>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Recent Events</h2>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : events && events.length > 0 ? (
            <div className="divide-y">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-orange-300 rounded-lg flex items-center justify-center text-2xl">
                      {event.category === "dance" && "💃"}
                      {event.category === "sports" && "🎾"}
                      {event.category === "music" && "🎸"}
                      {event.category === "hobbies" && "🎨"}
                      {event.category === "wellness" && "🧘"}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500">{event.activityType} • €{(event.priceCents / 100).toFixed(0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{event.totalTicketsSold ?? 0} tickets</p>
                      <p className="text-sm text-gray-500">
                        {event.genderMode === "mixed" 
                          ? `${event.maleCapacity}M / ${event.femaleCapacity}F capacity`
                          : `${event.totalCapacity} capacity`
                        }
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.isPublished && !event.isCancelled
                        ? "bg-green-100 text-green-700"
                        : event.isCancelled
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {event.isCancelled ? "Cancelled" : event.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <span className="text-5xl mb-4 block">📅</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-500 mb-4">Create your first event to get started</p>
              <Link href="/provider/events/new" className="text-rose-500 hover:text-rose-600 font-medium">
                Create Event →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
