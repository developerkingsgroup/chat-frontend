// src/context/AppContext.js
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WS_URL, getMe, getCompanies, getDepartments, getChatGroups, getUsers, getConversations } from '../utils/api';

const AppContext = createContext({});
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [token,         setToken]         = useState(null);
  const [currentUser,   setCurrentUser]   = useState(null);
  const [users,         setUsers]         = useState([]);
  const [companies,     setCompanies]     = useState([]);
  const [departments,   setDepartments]   = useState([]);
  const [chatGroups,    setChatGroups]    = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages,      setMessages]      = useState({}); // { `${type}_${id}`: [] }
  const [loading,       setLoading]       = useState(true);
  const [onlineUsers,   setOnlineUsers]   = useState(new Set());
  const wsRef = useRef(null);
  const currentUserRef = useRef(null);

  // Keep currentUserRef in sync so WS handlers always see the current user
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('token');
      if (saved) { setToken(saved); await loadAll(saved); }
      setLoading(false);
    })();
  }, []);

  const loadAll = async (tok) => {
    try {
      const [meR, coR, deR, cgR, usR, cvR] = await Promise.all([
        getMe(), getCompanies(), getDepartments(), getChatGroups(), getUsers(), getConversations(),
      ]);
      setCurrentUser(meR.data);
      setCompanies(coR.data);
      setDepartments(deR.data);
      setChatGroups(cgR.data);
      setUsers(usR.data);
      setConversations(cvR.data);
      connectWS(tok);
    } catch (e) { console.warn('[loadAll]', e.message); }
  };

  // ── WebSocket ────────────────────────────────────────────────────────────────
  const connectWS = useCallback((tok) => {
    if (wsRef.current) { try { wsRef.current.close(); } catch {} }
    const ws = new WebSocket(`${WS_URL}?token=${tok}`);
    ws.onmessage = (e) => {
      try { handleEvent(JSON.parse(e.data)); } catch {}
    };
    ws.onerror  = () => {};
    ws.onclose  = () => { setTimeout(() => tok && connectWS(tok), 4000); };
    wsRef.current = ws;
  }, []);

  const handleEvent = useCallback((payload) => {
    const { event, data } = payload;

    if (event === 'new_message') {
      const key = data.chat_type === 'group'
        ? `group_${data.chat_id}`
        : `direct_${[data.chat_id, data.sender_id].sort().join('_')}`;
      setMessages(prev => ({ ...prev, [key]: [...(prev[key] || []), data] }));
      if (data.chat_type === 'group') {
        setChatGroups(prev => prev.map(g => g.id === data.chat_id ? { ...g, unread: (g.unread||0)+1, last_message: data } : g));
      } else {
        setConversations(prev => prev.map(c => {
          const matches = c.user?.id === data.sender_id || c.user?.id === data.chat_id;
          return matches ? { ...c, unread: (c.unread||0)+1, last_message: data } : c;
        }));
      }
    }

    if (event === 'message_read') {
      const me = currentUserRef.current?.id;
      const key = data.chatType === 'group'
        ? `group_${data.chatId}`
        : `direct_${[data.chatId, me].sort().join('_')}`;
      setMessages(prev => {
        const msgs = prev[key];
        if (!msgs) return prev;
        return { ...prev, [key]: msgs.map(m => m.sender_id === me ? { ...m, is_read: true } : m) };
      });
    }

    if (event === 'user_presence') {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (data.status === 'online') next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    }

    if (event === 'online_users_snapshot') {
      setOnlineUsers(new Set(data.userIds));
    }

    if (event === 'reminder_created' || event === 'reminder_updated') {
      setReminderSignal(s => s + 1);
    }
  }, []);

  const [reminderSignal, setReminderSignal] = useState(0);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const signIn = async (tok, user) => {
    await AsyncStorage.setItem('token', tok);
    setToken(tok);
    setCurrentUser(user);
    await loadAll(tok);
  };

  const signOut = async () => {
    wsRef.current?.close();
    await AsyncStorage.removeItem('token');
    setToken(null); setCurrentUser(null); setUsers([]); setCompanies([]);
    setChatGroups([]); setConversations([]); setMessages({});
    setLoading(false);
  };

  // ── Message helpers ──────────────────────────────────────────────────────────
  const getKey = (type, id1, id2) =>
    type === 'group' ? `group_${id1}` : `direct_${[id1, id2].sort().join('_')}`;

  const loadMessages = (type, chatId, msgs) => {
    const key = getKey(type, chatId);
    setMessages(prev => ({ ...prev, [key]: msgs }));
  };

  const pushMessage = (type, chatId, msg) => {
    const key = getKey(type, chatId);
    setMessages(prev => ({ ...prev, [key]: [...(prev[key]||[]), msg] }));
  };

  const clearUnread = (type, chatId) => {
    if (type === 'group') setChatGroups(prev => prev.map(g => g.id===chatId ? {...g, unread:0} : g));
    else setConversations(prev => prev.map(c => c.user?.id===chatId ? {...c, unread:0} : c));
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const isAdmin   = !!currentUser?.is_super_admin;
  const chatUnread  = conversations.reduce((a,c)=>a+(c.unread||0), 0);
  const groupUnread = chatGroups.reduce((a,g)=>a+(g.unread||0), 0);

  return (
    <AppContext.Provider value={{
      token, currentUser, isAdmin, users, companies, departments,
      chatGroups, conversations, messages, loading, reminderSignal,
      onlineUsers, chatUnread, groupUnread, getKey,
      signIn, signOut, loadAll,
      loadMessages, pushMessage, clearUnread,
      setUsers, setCompanies, setChatGroups, setConversations,
    }}>
      {children}
    </AppContext.Provider>
  );
}