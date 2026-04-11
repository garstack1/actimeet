"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const { data, isLoading, error } = trpc.tickets.getTicket.useQuery({ id: ticketId });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading ticket...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Ticket not found</p>
          <Link href="/my-tickets" className="text-rose-500 hover:underline">Back to my tickets</Link>
        </div>
      </div>
    );
  }

  const { ticket, event } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <Link href="/my-tickets" className="text-gray-600 hover:text-gray-900">
            ← Back to my tickets
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Event Header */}
          <div className="h-32 bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center">
            <span className="text-6xl">
              {event.category === "dance" && "💃"}
              {event.category === "sports" && "🎾"}
              {event.category === "music" && "🎸"}
              {event.category === "hobbies" && "🎨"}
              {event.category === "wellness" && "🧘"}
            </span>
          </div>

          <div className="p-6">
            <span className="text-xs font-medium uppercase tracking-wide text-rose-500">
              {event.activityType}
            </span>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{event.title}</h1>

            {/* QR Code */}
            <div className="my-6 p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center">
              <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                {/* Simple QR placeholder - in production use a QR library */}
                <div className="text-center">
                  <span className="text-4xl">📱</span>
                  <p className="text-xs text-gray-500 mt-2">QR Code</p>
                </div>
              </div>
              <p className="text-lg font-mono font-bold text-gray-900">{ticket.ticketNumber}</p>
              <p className="text-xs text-gray-500 mt-1">Show this at the venue</p>
            </div>

            {/* Ticket Details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${
                  ticket.status === "active" ? "text-green-600" : "text-gray-600"
                }`}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
              </div>
              {ticket.genderSlot && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Ticket Type</span>
                  <span className={ticket.genderSlot === "male" ? "text-blue-600" : "text-pink-600"}>
                    {ticket.genderSlot === "male" ? "♂ Male" : "♀ Female"}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-medium">€{(ticket.amountPaidCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Purchased</span>
                <span>{new Date(ticket.createdAt!).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
