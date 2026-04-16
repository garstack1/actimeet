"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { trpc } from "@/lib/trpc";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<{ id: string; displayName: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      router.push("/login");
    }
  }, [router]);

  const { data, isLoading, refetch } = trpc.messaging.getMessages.useQuery(
    { conversationId },
    { enabled: !!user && !!conversationId, refetchInterval: 3000 }
  );

  const { data: otherUserData } = trpc.auth.me.useQuery(undefined, { enabled: false });

  // Get other user info
  const otherUserId = data?.otherUserId;
  const { data: conversations } = trpc.messaging.getConversations.useQuery(undefined, {
    enabled: !!user,
  });
  const otherUser = conversations?.find(c => c.id === conversationId)?.otherUser;

  const sendMessage = trpc.messaging.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
      refetch();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    sendMessage.mutate({
      conversationId,
      content: newMessage.trim(),
    });
  };

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/messages" className="text-gray-600 hover:text-gray-900">
            ←
          </Link>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center text-lg overflow-hidden">
            {otherUser?.photos?.[0] ? (
              <Image
                src={otherUser.photos[0]}
                alt=""
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            ) : (
              "👤"
            )}
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">
              {otherUser?.displayName || "Loading..."}
            </h1>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {isLoading ? (
            <div className="text-center text-gray-500">Loading messages...</div>
          ) : data?.messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <span className="text-4xl mb-4 block">👋</span>
              <p>Say hello to start the conversation!</p>
            </div>
          ) : (
            data?.messages.map((msg) => {
              const isMe = msg.senderId === user.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      isMe
                        ? "bg-rose-500 text-white rounded-br-md"
                        : "bg-white text-gray-900 rounded-bl-md shadow-sm"
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isMe ? "text-rose-200" : "text-gray-400"
                      }`}
                    >
                      {new Date(msg.createdAt!).toLocaleTimeString("en-IE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white flex-shrink-0">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sendMessage.isLoading}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-full font-medium transition"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
