"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { trpc } from "@/lib/trpc";

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    gender: "",
    city: "",
    countryCode: "IE",
    showExactAge: false,
  });

  const { data: user, isLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    onError: () => {
      router.push("/login");
    },
  });

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: (data) => {
      const stored = localStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        localStorage.setItem("user", JSON.stringify({ ...user, ...data }));
      }
      setIsEditing(false);
      refetch();
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        bio: user.bio || "",
        gender: user.gender || "",
        city: user.city || "",
        countryCode: user.countryCode || "IE",
        showExactAge: user.showExactAge || false,
      });
      setPhotos(user.photos || []);
    }
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photos.length >= 6) {
      alert("Maximum 6 photos allowed");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const { url } = await res.json();
      setPhotos([...photos, url]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const setMainPhoto = (index: number) => {
    const newPhotos = [...photos];
    const [photo] = newPhotos.splice(index, 1);
    newPhotos.unshift(photo);
    setPhotos(newPhotos);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getAgeRange = (age: number) => {
    const lower = Math.floor(age / 5) * 5;
    return `${lower}-${lower + 4}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (!user) return null;

  const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">💃</span>
            <span className="text-xl font-bold text-gray-900">ActiMeet</span>
          </Link>
          <Link href="/" className="text-gray-600 hover:text-gray-900">← Back to events</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Photos Section */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
              <span className="text-sm text-gray-500">{photos.length}/6</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                  <Image src={photo} alt={`Photo ${index + 1}`} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    {index !== 0 && (
                      <button
                        onClick={() => setMainPhoto(index)}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                        title="Set as main photo"
                      >
                        ⭐
                      </button>
                    )}
                    <button
                      onClick={() => removePhoto(index)}
                      className="p-2 bg-white rounded-full text-red-600 hover:bg-gray-100"
                      title="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-rose-500 text-white text-xs px-2 py-1 rounded-full">
                      Main
                    </div>
                  )}
                </div>
              ))}
              
              {photos.length < 6 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-rose-400 flex flex-col items-center justify-center text-gray-400 hover:text-rose-500 transition"
                >
                  {uploading ? (
                    <span className="text-sm">Uploading...</span>
                  ) : (
                    <>
                      <span className="text-3xl mb-1">+</span>
                      <span className="text-xs">Add Photo</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Profile Info */}
          <div className="p-6">
            {!isEditing ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{user.displayName}</h1>
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      {age && (
                        <span>{user.showExactAge ? `${age} years old` : `${getAgeRange(age)} years`}</span>
                      )}
                      {user.city && (
                        <>
                          <span>•</span>
                          <span>📍 {user.city}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Edit Profile
                  </button>
                </div>

                <div className="mb-6">
                  <h2 className="text-sm font-medium text-gray-500 mb-2">About me</h2>
                  <p className="text-gray-700">{user.bio || "No bio yet. Tell people about yourself!"}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 py-4 border-t border-b">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">0</div>
                    <div className="text-sm text-gray-500">Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">0</div>
                    <div className="text-sm text-gray-500">Connections</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-rose-500">
                      {user.subscriptionTier === "pro" ? "Pro" : "Free"}
                    </div>
                    <div className="text-sm text-gray-500">Plan</div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <h2 className="text-sm font-medium text-gray-500">Account</h2>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Email</span>
                    <span className="text-gray-900">{user.email}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Member since</span>
                    <span className="text-gray-900">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    rows={4}
                    maxLength={500}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none"
                    placeholder="Tell people about yourself..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    placeholder="Dublin"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showExactAge"
                    checked={formData.showExactAge}
                    onChange={(e) => setFormData({ ...formData, showExactAge: e.target.checked })}
                    className="w-4 h-4 text-rose-500 border-gray-300 rounded focus:ring-rose-500"
                  />
                  <label htmlFor="showExactAge" className="text-sm text-gray-700">
                    Show my exact age (instead of age range)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfile.isLoading}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white py-2 rounded-lg font-medium transition"
                  >
                    {updateProfile.isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {user.subscriptionTier !== "pro" && (
          <div className="mt-6 bg-gradient-to-r from-rose-500 to-orange-400 rounded-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Upgrade to Pro</h3>
            <p className="text-rose-100 mb-4">
              See who&apos;s attending events before you buy, get unlimited messages, and more!
            </p>
            <button className="bg-white text-rose-500 px-6 py-2 rounded-full font-medium hover:bg-rose-50 transition">
              Upgrade for €9.99/month
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
