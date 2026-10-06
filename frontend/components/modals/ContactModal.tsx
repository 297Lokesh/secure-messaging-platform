"use client";

import React, { useState } from "react";
import { X, Search, UserPlus, Trash2, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { UserSearchItem } from "@/types";
import { usersApi, contactsApi } from "@/lib/api";
import { Avatar } from "@/components/common/Avatar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useChat } from "@/context/ChatContext";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { contacts, refreshContacts, createDirectChat } = useChat();
  const [activeTab, setActiveTab] = useState<"list" | "search">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setActionMessage(null);
    try {
      const results = await usersApi.searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch {
      setActionMessage("Error searching users.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContact = async (userId: number) => {
    try {
      await contactsApi.addContact(userId);
      await refreshContacts();
      setActionMessage("Contact added to Signal address book.");
      setSearchResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_contact: true } : u))
      );
      setTimeout(() => setActionMessage(null), 2500);
    } catch (err: any) {
      setActionMessage(err.response?.data?.detail || "Could not add contact.");
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      await contactsApi.deleteContact(contactId);
      await refreshContacts();
      setActionMessage("Contact removed.");
      setTimeout(() => setActionMessage(null), 2500);
    } catch {
      setActionMessage("Error removing contact.");
    }
  };

  const handleStartChat = async (userId: number) => {
    await createDirectChat(userId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1b1b1e] rounded-2xl w-full max-w-md shadow-2xl border border-light-border dark:border-[#2d2d34] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-light-border dark:border-[#26262b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-signal-500" />
            <h2 className="font-semibold text-base text-light-text dark:text-[#f3f4f6]">
              Contacts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#26262b] text-slate-400 hover:text-slate-600 dark:hover:text-[#dedee3] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action notification banner */}
        {actionMessage && (
          <div className="bg-signal-50 dark:bg-signal-950/70 border-b border-signal-200 dark:border-signal-800 text-signal-700 dark:text-signal-300 text-xs px-4 py-2 font-medium text-center animate-in fade-in">
            {actionMessage}
          </div>
        )}

        {/* Tab switch */}
        <div className="flex border-b border-light-border dark:border-[#26262b] text-xs font-semibold px-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === "list"
                ? "border-signal-500 text-signal-600 dark:text-signal-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-[#8e8e93] dark:hover:text-[#dedee3]"
            }`}
          >
            My Contacts ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === "search"
                ? "border-signal-500 text-signal-600 dark:text-signal-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-[#8e8e93] dark:hover:text-[#dedee3]"
            }`}
          >
            Find & Add User
          </button>
        </div>

        {/* Tab 1: Contacts List */}
        {activeTab === "list" && (
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-[#26262b]/50">
            {contacts.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-[#383840] mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-[#a0a1a5]">No contacts yet</p>
                <p className="text-xs text-slate-400 dark:text-[#6e6e73] mt-1">
                  Connect with people by searching their username or phone.
                </p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-signal-50 dark:bg-signal-950/60 text-signal-600 dark:text-signal-400 hover:bg-signal-100 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Find users</span>
                </button>
              </div>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 hover:bg-[#f0f2f5] dark:hover:bg-[#26262b] rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={c.contact_user.avatar_url}
                      name={c.contact_user.display_name}
                      size="md"
                      isOnline={c.contact_user.is_online}
                    />
                    <div>
                      <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                        {c.contact_user.display_name}
                      </p>
                      <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                        @{c.contact_user.username} • {c.contact_user.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartChat(c.contact_user_id)}
                      className="px-3 py-1.5 rounded-full bg-signal-50 dark:bg-signal-950/60 text-signal-600 dark:text-signal-400 hover:bg-signal-100 dark:hover:bg-signal-900/60 transition-colors text-xs font-medium flex items-center gap-1.5"
                      title="Send Message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                    <button
                      onClick={() => handleDeleteContact(c.id)}
                      className="p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remove Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Search and Add Users */}
        {activeTab === "search" && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-[#8e8e93]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter username or phone number..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-full border border-transparent focus:border-signal-500/40 bg-[#f0f2f5] dark:bg-[#26262b] outline-none text-light-text dark:text-[#f3f4f6] placeholder:text-slate-400"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2 bg-signal-500 hover:bg-signal-600 disabled:opacity-40 text-white text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 shadow-xs"
              >
                {isSearching ? <LoadingSpinner size="sm" className="border-white" /> : "Search"}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#26262b]/50">
              {searchResults.length === 0 && searchQuery && !isSearching && (
                <p className="text-center text-xs text-slate-400 dark:text-[#8e8e93] py-8">
                  No Signal users found matching &ldquo;{searchQuery}&rdquo;
                </p>
              )}

              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2.5 hover:bg-[#f0f2f5] dark:hover:bg-[#26262b] rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user.avatar_url}
                      name={user.display_name}
                      size="md"
                      isOnline={user.is_online}
                    />
                    <div>
                      <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                        {user.display_name}
                      </p>
                      <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                        @{user.username} • {user.phone}
                      </p>
                    </div>
                  </div>

                  {user.is_contact ? (
                    <button
                      onClick={() => handleStartChat(user.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-[#f0f2f5] dark:bg-[#26262b] hover:bg-slate-200 dark:hover:bg-[#323238] text-slate-700 dark:text-[#dedee3] rounded-full transition-colors flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddContact(user.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-signal-500 hover:bg-signal-600 text-white rounded-full transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
