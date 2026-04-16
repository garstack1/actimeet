"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { trpc } from "@/lib/trpc";

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      router.push("/login");
    }
  }, [router]);

  const { data: conversations, isLoading } = trpc.messaging.getConversations.useQuery(
    undefined,
    { enabled: !!user, refetchInterval: 5000 }
  );

  const { data: connections } = trpc.messaging.getConnections.useQuery(
    undefined,
    { enabled: !!user }
  );

  const createConversation = trpc.messaging.getOrCreateConversation.useMutation({
    onSuccess: (data) => {
      router.push(`/messages/${data.conversationId}`);
    },
  });

  if (!user) return null;

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    if (diff < 86400000) {
      return d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString("en-IE", { weekday: "short" });
    }
    return d.toLocaleDateString("en-IE", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">💃</span>
            <span className="text-xl font-bold text-gray-900">ActiMeet</span>
          </Link>
          <Link href="/" className="text-gray-600 hover:text-gray-900">← Back</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

        {/* Conversations */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : conversations && conversations.length > 0 ? (
            <div className="divide-y">
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                    {conv.otherUser?.photos?.[0] ? (
                      <Image
                        src={conv.otherUser.photos[0]}
                        alt=""
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conv.otherUser?.displayName || "Unknown"}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.lastMessagePreview || "No messages yet"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <span className="text-4xl mb-4 block">💬</span>
              <p className="text-gray-500">No conversations yet</p>
            </div>
          )}
        </div>

        {/* Connections - People you can message */}
        {connections && connections.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              People from your events
            </h2>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex flex-wrap gap-3">
                {connections.map((connection) => (
                  <button
                    key={connection.id}
                    onClick={() => createConversation.mutate({ otherUserId: connection.id })}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center text-sm overflow-hidden">
                      {connection.photos?.[0] ? (
                        <Image
                          src={connection.photos[0]}
                          alt=""
                          width={32}
                          height={32}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <span className="text-sm font-medium">{connection.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
