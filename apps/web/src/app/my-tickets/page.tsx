"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MyTicketsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ displayName: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      router.push("/login");
    }
  }, [router]);

  const { data: tickets, isLoading, error } = trpc.tickets.myTickets.useQuery(
    { status: "all" },
    { enabled: !!user }
  );

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">💃</span>
            <span className="text-xl font-bold text-gray-900">ActiMeet</span>
          </Link>
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            ← Back to events
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Tickets</h1>

        {isLoading && <p className="text-gray-500">Loading tickets...</p>}
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            Failed to load tickets. Please try again.
          </div>
        )}

        {tickets && tickets.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🎟️</span>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No tickets yet</h2>
            <p className="text-gray-600 mb-6">Browse events and get your first ticket!</p>
            <Link href="/" className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full font-medium transition">
              Browse Events
            </Link>
          </div>
        )}

        {tickets && tickets.length > 0 && (
          <div className="space-y-4">
            {tickets.map(({ ticket, event }) => (
              <div key={ticket.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="flex">
                  {/* Event Image */}
                  <div className="w-32 h-32 bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl">
                      {event.category === "dance" && "💃"}
                      {event.category === "sports" && "🎾"}
                      {event.category === "music" && "🎸"}
                      {event.category === "hobbies" && "🎨"}
                      {event.category === "wellness" && "🧘"}
                    </span>
                  </div>

                  {/* Ticket Info */}
                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-rose-500">
                          {event.activityType}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900 mt-1">
                          {event.title}
                        </h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        ticket.status === "active" 
                          ? "bg-green-100 text-green-700"
                          : ticket.status === "used"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {ticket.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                      <span>🎟️ {ticket.ticketNumber}</span>
                      {ticket.genderSlot && (
                        <span className={ticket.genderSlot === "male" ? "text-blue-600" : "text-pink-600"}>
                          {ticket.genderSlot === "male" ? "♂ Male" : "♀ Female"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* QR Code Button */}
                  <div className="flex items-center px-4 border-l">
                    <Link 
                      href={`/my-tickets/${ticket.id}`}
                      className="text-rose-500 hover:text-rose-600 font-medium text-sm"
                    >
                      View QR →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
