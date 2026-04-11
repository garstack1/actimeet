"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [user, setUser] = useState<{ id: string; displayName: string; gender?: string } | null>(null);
  const [selectedGender, setSelectedGender] = useState<"male" | "female" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const { data: event, isLoading, error } = trpc.events.getById.useQuery({ id: eventId });

  const purchaseTicket = trpc.tickets.purchase.useMutation({
    onSuccess: () => {
      alert("Ticket purchased! 🎉");
      router.push("/my-tickets");
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  const handlePurchase = () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (event?.genderMode === "mixed" && !selectedGender) {
      alert("Please select male or female ticket");
      return;
    }

    purchaseTicket.mutate({
      eventId,
      genderSlot: selectedGender ?? undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Event not found</p>
          <Link href="/" className="text-rose-500 hover:underline">Back to events</Link>
        </div>
      </div>
    );
  }

  const maleAvailable = (event.maleCapacity ?? 0) - (event.maleTicketsSold ?? 0);
  const femaleAvailable = (event.femaleCapacity ?? 0) - (event.femaleTicketsSold ?? 0);
  const totalAvailable = (event.totalCapacity ?? 0) - (event.totalTicketsSold ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">💃</span>
            <span className="text-xl font-bold text-gray-900">ActiMeet</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm mb-6 inline-block">
          ← Back to events
        </Link>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Hero Image */}
          <div className="h-64 bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center">
            <span className="text-8xl">
              {event.category === "dance" && "💃"}
              {event.category === "sports" && "🎾"}
              {event.category === "music" && "🎸"}
              {event.category === "hobbies" && "🎨"}
              {event.category === "wellness" && "🧘"}
            </span>
          </div>

          <div className="p-8">
            {/* Category & Location */}
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full font-medium">
                {event.activityType}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">{event.venue?.city}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

            {/* Description */}
            <p className="text-gray-600 mb-6">{event.description || event.shortDescription}</p>

            {/* Venue */}
            {event.venue && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-1">📍 {event.venue.name}</h3>
                <p className="text-gray-600 text-sm">
                  {event.venue.addressLine1}, {event.venue.city}
                </p>
              </div>
            )}

            {/* Sessions */}
            {event.sessions && event.sessions.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">📅 Sessions</h3>
                <div className="space-y-2">
                  {event.sessions.map((session: { id: string; sessionDate: string; startTime: string; endTime: string }) => (
                    <div key={session.id} className="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
                      <span className="font-medium">{new Date(session.sessionDate).toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="text-gray-500">{session.startTime} - {session.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Age Restriction */}
            {(event.minAge || event.maxAge) && (
              <div className="bg-amber-50 text-amber-800 px-4 py-2 rounded-lg mb-6 text-sm">
                ⚠️ Age restriction: {event.minAge && `${event.minAge}+`} {event.minAge && event.maxAge && "to"} {event.maxAge && `${event.maxAge}`} years
              </div>
            )}

            {/* Purchase Section */}
            <div className="border-t pt-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  €{(event.priceCents / 100).toFixed(0)}
                </span>
                <span className="text-gray-500">per person</span>
              </div>

              {/* Gender Selection for Mixed Events */}
              {event.genderMode === "mixed" && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Select ticket type:</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedGender("male")}
                      disabled={maleAvailable <= 0}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                        selectedGender === "male"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      } ${maleAvailable <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="text-blue-600 font-semibold">♂ Male</div>
                      <div className="text-sm text-gray-500">{maleAvailable} spots left</div>
                    </button>
                    <button
                      onClick={() => setSelectedGender("female")}
                      disabled={femaleAvailable <= 0}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                        selectedGender === "female"
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300"
                      } ${femaleAvailable <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="text-pink-600 font-semibold">♀ Female</div>
                      <div className="text-sm text-gray-500">{femaleAvailable} spots left</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Open/Same-gender availability */}
              {event.genderMode !== "mixed" && (
                <p className="text-gray-600 mb-4">{totalAvailable} spots remaining</p>
              )}

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={purchaseTicket.isLoading}
                className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white py-4 rounded-xl font-semibold text-lg transition"
              >
                {purchaseTicket.isLoading ? "Processing..." : user ? "Buy Ticket" : "Log in to Buy"}
              </button>

              {!user && (
                <p className="text-center text-sm text-gray-500 mt-3">
                  <Link href="/login" className="text-rose-500 hover:underline">Log in</Link> or{" "}
                  <Link href="/signup" className="text-rose-500 hover:underline">sign up</Link> to purchase
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
