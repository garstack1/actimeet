"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

const categories = [
  { value: "dance", label: "Dance", emoji: "💃" },
  { value: "sports", label: "Sports", emoji: "🎾" },
  { value: "music", label: "Music", emoji: "🎸" },
  { value: "hobbies", label: "Hobbies", emoji: "🎨" },
  { value: "wellness", label: "Wellness", emoji: "🧘" },
];

export default function CreateEventPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    category: "dance" as "dance" | "sports" | "music" | "hobbies" | "wellness" | "other",
    activityType: "",
    genderMode: "mixed" as "mixed" | "same_gender" | "open",
    maleCapacity: 10,
    femaleCapacity: 10,
    totalCapacity: 20,
    minAge: 18,
    maxAge: undefined as number | undefined,
    priceCents: 2000,
    venueId: "",
    sessionDate: "",
    startTime: "19:00",
    endTime: "21:00",
  });

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

  // Get provider's venues
  const { data: venues } = trpc.venues.myVenues.useQuery(undefined, {
    enabled: !!user && (user.role === "provider" || user.role === "admin"),
  });

  const createEvent = trpc.events.create.useMutation({
    onSuccess: (data) => {
      alert("Event created! 🎉");
      router.push(`/provider`);
    },
    onError: (err) => alert(err.message),
  });

  const handleSubmit = () => {
    if (!formData.venueId) {
      alert("Please select a venue");
      return;
    }
    if (!formData.sessionDate) {
      alert("Please select a date");
      return;
    }

    createEvent.mutate({
      venueId: formData.venueId,
      title: formData.title,
      shortDescription: formData.shortDescription,
      description: formData.description,
      category: formData.category,
      activityType: formData.activityType,
      genderMode: formData.genderMode,
      maleCapacity: formData.genderMode === "mixed" ? formData.maleCapacity : undefined,
      femaleCapacity: formData.genderMode === "mixed" ? formData.femaleCapacity : undefined,
      totalCapacity: formData.genderMode !== "mixed" ? formData.totalCapacity : undefined,
      minAge: formData.minAge,
      maxAge: formData.maxAge,
      priceCents: formData.priceCents,
      sessions: [{
        sessionDate: formData.sessionDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
      }],
    });
  };

  if (!user || (user.role !== "provider" && user.role !== "admin")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/provider" className="flex items-center gap-2">
            <span className="text-2xl">💃</span>
            <span className="text-xl font-bold text-gray-900">ActiMeet</span>
            <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-2">Provider</span>
          </Link>
          <Link href="/provider" className="text-gray-600 hover:text-gray-900 text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Event</h1>
        <p className="text-gray-600 mb-8">Fill in the details for your event</p>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= s ? "bg-rose-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {s}
              </div>
              <span className={`ml-2 text-sm ${step >= s ? "text-gray-900" : "text-gray-500"}`}>
                {s === 1 && "Basics"}
                {s === 2 && "Details"}
                {s === 3 && "Schedule"}
              </span>
              {s < 3 && <div className="w-16 h-0.5 bg-gray-200 mx-4" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  placeholder="Bachata Beginners Night"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value as typeof formData.category })}
                      className={`p-4 rounded-lg border-2 text-center transition ${
                        formData.category === cat.value
                          ? "border-rose-500 bg-rose-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{cat.emoji}</span>
                      <span className="text-sm font-medium">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  placeholder="e.g., Bachata, Tennis, Yoga..."
                  value={formData.activityType}
                  onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Description *</label>
                <textarea
                  rows={2}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none"
                  placeholder="A brief description shown in event listings"
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                />
              </div>

              <button
                onClick={() => {
                  if (!formData.title || !formData.activityType || !formData.shortDescription) {
                    alert("Please fill in all required fields");
                    return;
                  }
                  setStep(2);
                }}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-lg font-semibold transition"
              >
                Next: Details →
              </button>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender Mode *</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, genderMode: "mixed" })}
                    className={`p-4 rounded-lg border-2 text-center transition ${
                      formData.genderMode === "mixed"
                        ? "border-rose-500 bg-rose-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-lg block mb-1">👫</span>
                    <span className="text-sm font-medium">Mixed</span>
                    <span className="text-xs text-gray-500 block">Balanced M/F</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, genderMode: "open" })}
                    className={`p-4 rounded-lg border-2 text-center transition ${
                      formData.genderMode === "open"
                        ? "border-rose-500 bg-rose-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-lg block mb-1">🙋</span>
                    <span className="text-sm font-medium">Open</span>
                    <span className="text-xs text-gray-500 block">Any gender</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, genderMode: "same_gender" })}
                    className={`p-4 rounded-lg border-2 text-center transition ${
                      formData.genderMode === "same_gender"
                        ? "border-rose-500 bg-rose-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-lg block mb-1">👥</span>
                    <span className="text-sm font-medium">Same Gender</span>
                    <span className="text-xs text-gray-500 block">Single gender</span>
                  </button>
                </div>
              </div>

              {formData.genderMode === "mixed" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Male Capacity</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                      value={formData.maleCapacity}
                      onChange={(e) => setFormData({ ...formData, maleCapacity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Female Capacity</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                      value={formData.femaleCapacity}
                      onChange={(e) => setFormData({ ...formData, femaleCapacity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Capacity</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    value={formData.totalCapacity}
                    onChange={(e) => setFormData({ ...formData, totalCapacity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Age</label>
                  <input
                    type="number"
                    min="12"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    value={formData.minAge}
                    onChange={(e) => setFormData({ ...formData, minAge: parseInt(e.target.value) || 18 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Age (optional)</label>
                  <input
                    type="number"
                    min="12"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    placeholder="No limit"
                    value={formData.maxAge || ""}
                    onChange={(e) => setFormData({ ...formData, maxAge: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (EUR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    value={(formData.priceCents / 100).toFixed(2)}
                    onChange={(e) => setFormData({ ...formData, priceCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold transition"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-lg font-semibold transition"
                >
                  Next: Schedule →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
                {venues && venues.length > 0 ? (
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    value={formData.venueId}
                    onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                  >
                    <option value="">Select a venue...</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name} - {venue.city}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm">
                    You don't have any venues yet.{" "}
                    <Link href="/provider/venues/new" className="underline font-medium">
                      Add a venue first
                    </Link>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Date *</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Description (optional)</label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none"
                  placeholder="Detailed description of your event..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createEvent.isLoading || !formData.venueId || !formData.sessionDate}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white py-3 rounded-lg font-semibold transition"
                >
                  {createEvent.isLoading ? "Creating..." : "Create Event"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
