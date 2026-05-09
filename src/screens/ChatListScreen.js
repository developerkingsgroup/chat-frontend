// src/screens/ChatListScreen.js
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Pressable,
  RefreshControl, TextInput, Modal, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { getConversations } from '../utils/api';
import { C, T, Avatar, Badge, Screen } from '../components/UI';
import moment from 'moment';

const PINNED_CO_KEY  = 'pinned_companies_v1';
const PINNED_USR_KEY = 'pinned_users_v1';

// ── User row ──────────────────────────────────────────────────────────────────
function UserRow({ user, dm, isOnline, isPinned, onPress, onLongPress }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View style={{ position: 'relative' }}>
        <Avatar emoji={user.avatar || '👤'} color={user.color || C.blue} size={44} />
        {isOnline && (
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: C.green, borderWidth: 2, borderColor: C.bg }} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[T.h3, { flex: 1 }]} numberOfLines={1}>{user.name}</Text>
          {isPinned && <Text style={{ fontSize: 10 }}>📌</Text>}
          {dm?.last_message && (
            <Text style={T.xs}>{moment(dm.last_message.created_at).fromNow(true)}</Text>
          )}
        </View>
        <Text style={[T.sm, { color: user.color || C.text3, marginTop: 1 }]} numberOfLines={1}>
          {user.is_super_admin ? '👑 Super Admin' : user.role || 'User'}
        </Text>
        <Text style={[T.sm, { color: C.text4, marginTop: 1 }]} numberOfLines={1}>
          {dm?.last_message?.content || 'Tap to start chatting'}
        </Text>
      </View>
      <Badge count={dm?.unread} />
    </Pressable>
  );
}

// ── Company header ────────────────────────────────────────────────────────────
function CompanyHeader({ company, isPinned, onLongPress }) {
  if (company.id === '_other') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 5 }}>
        <Text style={{ fontSize: 14 }}>👤</Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Other</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      </View>
    );
  }
  return (
    <Pressable
      onLongPress={onLongPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 5 }}>
      <Text style={{ fontSize: 14 }}>{company.avatar || '🏢'}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: company.color || C.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {company.name}
      </Text>
      {isPinned && <Text style={{ fontSize: 11 }}>📌</Text>}
      <View style={{ flex: 1, height: 1, backgroundColor: (company.color || C.text3) + '33' }} />
    </Pressable>
  );
}

// ── Menu modal ────────────────────────────────────────────────────────────────
function MenuModal({ visible, onClose, navigation }) {
  const { signOut, currentUser } = useApp();
  const navigate = (route) => { onClose(); navigation.navigate(route); };

  const handleLogout = () => {
    onClose();
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ width: '72%', backgroundColor: C.bg, paddingTop: 60, paddingHorizontal: 20, borderRightWidth: 1, borderRightColor: C.border, justifyContent: 'space-between' }}>
          <View>
            {/* User info */}
            {currentUser && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <View style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: (currentUser.color || C.blue) + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{currentUser.avatar || '👤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }} numberOfLines={1}>{currentUser.name}</Text>
                  <Text style={{ fontSize: 11, color: C.text3, marginTop: 1 }} numberOfLines={1}>{currentUser.role || 'User'}</Text>
                </View>
              </View>
            )}

            <Text style={{ fontSize: 10, fontWeight: '700', color: C.text4, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
              Manage
            </Text>
            {[
              ['👤  Create User',       'ManageUser'],
              ['🏢  Create Company',    'ManageCompany'],
              ['🌿  Create Branch',     'ManageBranch'],
              ['🏷️  Create Department', 'ManageDept'],
            ].map(([label, route]) => (
              <TouchableOpacity key={route} onPress={() => navigate(route)}
                style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ color: C.text, fontSize: 15 }}>{label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={{ fontSize: 10, fontWeight: '700', color: C.text4, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 22, marginBottom: 8 }}>
              Attendance
            </Text>
            <TouchableOpacity
              onPress={() => { onClose(); Alert.alert('Coming Soon', 'Attendance feature coming soon'); }}
              style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ color: C.text, fontSize: 15 }}>📅  Upcoming</Text>
            </TouchableOpacity>
          </View>

          {/* Logout at bottom */}
          <TouchableOpacity onPress={handleLogout}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 18, borderTopWidth: 1, borderTopColor: C.border }}>
            <Text style={{ fontSize: 18 }}>🚪</Text>
            <Text style={{ fontSize: 15, color: '#EF4444', fontWeight: '600' }}>Logout</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onClose} activeOpacity={1} />
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ChatListScreen({ navigation }) {
  const { conversations, setConversations, users, currentUser, onlineUsers, companies, reminderUnread } = useApp();
  const [refreshing,    setRefreshing]    = useState(false);
  const [searchText,    setSearchText]    = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [pinnedCos,     setPinnedCos]     = useState(new Set());
  const [pinnedUsrs,    setPinnedUsrs]    = useState(new Set());
  const [showMenu,      setShowMenu]      = useState(false);

  // Load pins
  useEffect(() => {
    AsyncStorage.getItem(PINNED_CO_KEY).then(v => { if (v) setPinnedCos(new Set(JSON.parse(v))); });
    AsyncStorage.getItem(PINNED_USR_KEY).then(v => { if (v) setPinnedUsrs(new Set(JSON.parse(v))); });
  }, []);

  // Set menu button in header
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => setShowMenu(true)} style={{ marginLeft: 14, padding: 6 }}>
          <Text style={{ fontSize: 20, color: C.text }}>☰</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const load = async () => {
    try { const r = await getConversations(); setConversations(r.data); } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const togglePinCo = async (coId) => {
    const next = new Set(pinnedCos);
    next.has(coId) ? next.delete(coId) : next.add(coId);
    setPinnedCos(next);
    await AsyncStorage.setItem(PINNED_CO_KEY, JSON.stringify([...next]));
  };

  const togglePinUser = async (userId) => {
    const next = new Set(pinnedUsrs);
    next.has(userId) ? next.delete(userId) : next.add(userId);
    setPinnedUsrs(next);
    await AsyncStorage.setItem(PINNED_USR_KEY, JSON.stringify([...next]));
  };

  const openChat = (u) => navigation.navigate('Chat', {
    chatType: 'direct', chatId: u.id, title: u.name,
    subtitle: u.is_super_admin ? 'Super Admin' : (u.role || 'User'),
    avatar: u.avatar, color: u.color || C.blue,
  });

  const allOtherUsers = useMemo(() => (users || []).filter(u => u.id !== currentUser?.id), [users, currentUser]);

  // Build grouped flat list data
  const listData = useMemo(() => {
    const items = [];

    // Sort companies: pinned first, preserve original order within each group
    const sortedCos = [...(companies || [])];
    sortedCos.sort((a, b) => {
      const aP = pinnedCos.has(a.id), bP = pinnedCos.has(b.id);
      if (aP && !bP) return -1;
      if (!aP && bP) return 1;
      return 0;
    });

    const usedIds = new Set();

    sortedCos.forEach(co => {
      const coUsers = allOtherUsers.filter(u =>
        u.company_id === co.id && conversations.find(c => c.user?.id === u.id)
      );
      if (coUsers.length === 0) return;

      // Sort users: pinned first, then by latest DM message
      coUsers.sort((a, b) => {
        const aP = pinnedUsrs.has(a.id), bP = pinnedUsrs.has(b.id);
        if (aP && !bP) return -1;
        if (!aP && bP) return 1;
        const aDm = conversations.find(c => c.user?.id === a.id);
        const bDm = conversations.find(c => c.user?.id === b.id);
        const aT = aDm?.last_message ? new Date(aDm.last_message.created_at).getTime() : 0;
        const bT = bDm?.last_message ? new Date(bDm.last_message.created_at).getTime() : 0;
        return bT - aT;
      });

      items.push({ type: 'company', data: co, key: `co_${co.id}` });
      coUsers.forEach(u => { items.push({ type: 'user', data: u, key: `usr_${u.id}` }); usedIds.add(u.id); });
    });

    // Users with no company but with an existing conversation
    const orphans = allOtherUsers.filter(u =>
      !usedIds.has(u.id) && conversations.find(c => c.user?.id === u.id)
    );
    if (orphans.length > 0) {
      orphans.sort((a, b) => {
        const aP = pinnedUsrs.has(a.id), bP = pinnedUsrs.has(b.id);
        if (aP && !bP) return -1;
        if (!aP && bP) return 1;
        const aDm = conversations.find(c => c.user?.id === a.id);
        const bDm = conversations.find(c => c.user?.id === b.id);
        const aT = aDm?.last_message ? new Date(aDm.last_message.created_at).getTime() : 0;
        const bT = bDm?.last_message ? new Date(bDm.last_message.created_at).getTime() : 0;
        return bT - aT;
      });
      items.push({ type: 'company', data: { id: '_other', name: 'Other', avatar: '👤', color: C.text3 }, key: 'co__other' });
      orphans.forEach(u => items.push({ type: 'user', data: u, key: `usr_${u.id}` }));
    }

    return items;
  }, [companies, allOtherUsers, conversations, pinnedCos, pinnedUsrs]);

  // Search results
  const searchResults = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    if (!q && !searchFocused) return null;
    if (!q) {
      // Focused but empty: show users not yet in conversations
      return allOtherUsers.filter(u => !conversations.find(c => c.user?.id === u.id));
    }
    return allOtherUsers.filter(u => u.name?.toLowerCase().includes(q));
  }, [searchText, searchFocused, allOtherUsers, conversations]);

  const renderItem = ({ item }) => {
    if (item.type === 'company') {
      return (
        <CompanyHeader
          company={item.data}
          isPinned={pinnedCos.has(item.data.id)}
          onLongPress={() => togglePinCo(item.data.id)}
        />
      );
    }
    const u = item.data;
    const dm = conversations.find(c => c.user?.id === u.id);
    return (
      <UserRow
        user={u}
        dm={dm}
        isOnline={onlineUsers.has(u.id)}
        isPinned={pinnedUsrs.has(u.id)}
        onPress={() => openChat(u)}
        onLongPress={() => togglePinUser(u.id)}
      />
    );
  };

  const renderSearchItem = ({ item }) => {
    const dm = conversations.find(c => c.user?.id === item.id);
    return (
      <UserRow
        user={item}
        dm={dm}
        isOnline={onlineUsers.has(item.id)}
        isPinned={pinnedUsrs.has(item.id)}
        onPress={() => openChat(item)}
        onLongPress={() => togglePinUser(item.id)}
      />
    );
  };

  const isSearching = searchText.length > 0 || searchFocused;

  return (
    <Screen>
      <MenuModal visible={showMenu} onClose={() => setShowMenu(false)} navigation={navigation} />

      {/* Search bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', margin: 10,
        backgroundColor: C.card, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1, borderColor: searchFocused ? C.blue + '66' : C.border,
      }}>
        <Text style={{ fontSize: 13, color: C.text4, marginRight: 6 }}>🔍</Text>
        <TextInput
          placeholder="Search users..."
          placeholderTextColor={C.text4}
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{ flex: 1, color: C.text, fontSize: 14, paddingVertical: 0 }}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={{ fontSize: 13, color: C.text4 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSearching ? (
        /* Search / new-user results */
        <FlatList
          data={searchResults || []}
          keyExtractor={i => i.id}
          renderItem={renderSearchItem}
          ListHeaderComponent={
            !searchText.trim() ? (
              <View style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text style={{ fontSize: 11, color: C.text4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  New Conversation
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 32 }}>🔍</Text>
              <Text style={[T.sm, { marginTop: 8 }]}>No users found</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        /* Grouped company view */
        <FlatList
          data={listData}
          keyExtractor={i => i.key}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
          ListHeaderComponent={
            <TouchableOpacity
              onPress={() => navigation.navigate('MyReminders')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#6D28D922', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>🔔</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={T.h3}>My Reminders</Text>
                <Text style={[T.sm, { color: C.text4 }]}>Tasks & assignments</Text>
              </View>
              <Badge count={reminderUnread} />
              <Text style={{ fontSize: 16, color: C.text4, marginLeft: 4 }}>›</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 32 }}>💬</Text>
              <Text style={[T.sm, { marginTop: 8 }]}>No users yet</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}
