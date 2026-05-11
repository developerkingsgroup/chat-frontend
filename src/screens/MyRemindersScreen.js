// src/screens/MyRemindersScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Pressable,
  RefreshControl, Modal, ScrollView, Alert, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getReminders, updateReminder, setReminderStatus } from '../utils/api';
import { C, T, Screen, PRIORITY, STATUS } from '../components/UI';
import moment from 'moment';

const LAST_SEEN_KEY = 'my_reminders_last_seen_ts';

const getRefId = (f) => {
  if (!f) return '';
  if (typeof f === 'object') return f.id || f._id || '';
  return f;
};

const resolveUser = (field, users) => {
  if (!field) return null;
  if (typeof field === 'object') return field;
  return users?.find(u => u.id === field) || null;
};

// Build context label + icon for each notification
function getCtx(r, me) {
  const forUserId = getRefId(r.for_user_id);
  const creatorId = getRefId(r.created_by);
  const forUser   = resolveUser(r.for_user_id, null);
  const creator   = resolveUser(r.created_by, null);
  const isAssignee = forUserId === me;
  const isCreator  = creatorId === me;

  switch (r.status) {
    case 'pending':
      if (isAssignee && !isCreator)
        return { icon: '🔔', color: PRIORITY[r.priority]?.color || C.blue, label: `Assigned by ${creator?.name || '—'}` };
      if (isAssignee && isCreator)
        return { icon: '🔔', color: PRIORITY[r.priority]?.color || C.blue, label: 'Self-assigned' };
      if (isCreator)
        return { icon: '📋', color: C.text3, label: `Assigned to ${forUser?.name || '—'}` };
      break;
    case 'review':
      if (isCreator)
        return { icon: '🔍', color: '#F59E0B', label: `${forUser?.name || 'Someone'} submitted for review` };
      if (isAssignee)
        return { icon: '⏳', color: '#F59E0B', label: 'Submitted · Awaiting approval' };
      break;
    case 'approved':
      return { icon: '✅', color: '#10B981', label: isAssignee ? 'Your task was approved' : `${forUser?.name || 'Task'} approved` };
    case 'rejected':
      return { icon: '❌', color: '#EF4444', label: isAssignee ? 'Rejected · Needs revision' : `${forUser?.name || 'Task'} rejected` };
  }
  return { icon: '🔔', color: C.text3, label: '' };
}

// ── Notification item ─────────────────────────────────────────────────────────
function NotifItem({ r, me, isUnseen, onPress }) {
  const ctx  = getCtx(r, me);
  const done = r.status === 'approved' || r.status === 'rejected';

  return (
    <TouchableOpacity onPress={() => onPress(r)} activeOpacity={0.75} style={{
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: C.border,
    }}>
      {/* Status icon bubble */}
      <View style={{
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: ctx.color + '1A',
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
      }}>
        <Text style={{ fontSize: 20 }}>{ctx.icon}</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{
          fontSize: 15, fontWeight: '600',
          color: done ? C.text3 : C.text,
          textDecorationLine: r.status === 'rejected' ? 'line-through' : 'none',
        }} numberOfLines={1}>{r.title}</Text>
        <Text style={{ fontSize: 12, color: C.text3, marginTop: 2 }} numberOfLines={1}>{ctx.label}</Text>
        {r.due_date && (
          <Text style={{ fontSize: 11, color: done ? C.text4 : C.blue, marginTop: 2 }}>
            {moment(r.due_date).format('ddd, MMM D · h:mm A')}
          </Text>
        )}
      </View>

      {/* Right meta */}
      <View style={{ alignItems: 'flex-end', gap: 5, marginLeft: 8 }}>
        <Text style={{ fontSize: 10, color: C.text4 }}>
          {moment(r.updated_at || r.created_at).fromNow(true)}
        </Text>
        {isUnseen && (
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.blue }} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Quick Detail Sheet ────────────────────────────────────────────────────────
function QuickDetailSheet({ r, users, currentUser, onClose, onAction, onDataChange }) {
  const [editTitle,        setEditTitle]        = useState('');
  const [editNote,         setEditNote]         = useState('');
  const [dirty,            setDirty]            = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [showRejectInput,  setShowRejectInput]  = useState(false);
  const [rejectReason,     setRejectReason]     = useState('');
  const [showReassignEdit, setShowReassignEdit] = useState(false);
  const [reassignTitle,    setReassignTitle]    = useState('');
  const [reassignNote,     setReassignNote]     = useState('');
  const [reassigning,      setReassigning]      = useState(false);

  useEffect(() => {
    if (r) {
      setEditTitle(r.title || '');
      setEditNote(r.note || '');
      setDirty(false);
      setShowRejectInput(false);
      setRejectReason('');
      setShowReassignEdit(false);
      setReassignTitle('');
      setReassignNote('');
    }
  }, [r?.id]);

  if (!r) return null;

  const forUserId      = getRefId(r.for_user_id);
  const creatorId      = getRefId(r.created_by);
  const forUser        = resolveUser(r.for_user_id, users);
  const fromUser       = resolveUser(r.created_by, users);
  const isAssignee     = forUserId === currentUser?.id;
  const isSelfAssigned = forUserId === creatorId;
  const canEdit        = isAssignee && (r.status === 'pending' || r.status === 'rejected');
  const iCanReview     = r.status === 'review' && !isSelfAssigned && (
    creatorId === currentUser?.id ||
    currentUser?.is_super_admin
  );
  const markDoneStatus = isSelfAssigned ? 'approved' : 'review';
  const markDoneLabel  = isSelfAssigned ? 'Mark as Done' : 'Submit for Review';

  const pr = PRIORITY[r.priority] || PRIORITY.medium;
  const st = STATUS[r.status]     || STATUS.pending;

  const saveChanges = async () => {
    if (!editTitle.trim()) { Alert.alert('Error', 'Title cannot be empty'); return; }
    setSaving(true);
    try {
      await updateReminder(r.id, { title: editTitle.trim(), note: editNote });
      setDirty(false);
      onDataChange?.();
    } catch { Alert.alert('Error', 'Could not save'); }
    finally { setSaving(false); }
  };

  const saveAndReactivate = async () => {
    if (!reassignTitle.trim()) { Alert.alert('Error', 'Title cannot be empty'); return; }
    setReassigning(true);
    try {
      await updateReminder(r.id, { title: reassignTitle.trim(), note: reassignNote });
      await setReminderStatus(r.id, 'pending');
      onDataChange?.();
      onClose();
    } catch { Alert.alert('Error', 'Could not reactivate'); }
    finally { setReassigning(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' }}>
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 38, height: 4, backgroundColor: C.border2, borderRadius: 2 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
            {/* Badges */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <View style={{ backgroundColor: pr.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ color: pr.color, fontWeight: '700', fontSize: 11 }}>{pr.icon} {pr.label}</Text>
              </View>
              <View style={{ backgroundColor: st.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ color: st.color, fontWeight: '700', fontSize: 11 }}>{st.icon} {st.label}</Text>
              </View>
            </View>

            {/* Title */}
            {canEdit ? (
              <TextInput value={editTitle} onChangeText={v => { setEditTitle(v); setDirty(true); }}
                style={{ fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 10, borderBottomWidth: 1.5, borderBottomColor: dirty ? C.purple + 'AA' : C.border, paddingBottom: 4 }}
                multiline placeholder="Reminder title..." placeholderTextColor={C.text4} />
            ) : (
              <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 10 }}>{r.title}</Text>
            )}

            {/* Note */}
            {canEdit ? (
              <TextInput value={editNote} onChangeText={v => { setEditNote(v); setDirty(true); }}
                placeholder="Add a description..." placeholderTextColor={C.text4} multiline
                style={{ backgroundColor: C.card, borderRadius: 10, padding: 12, color: C.text, minHeight: 64, marginBottom: 14, fontSize: 14, borderWidth: 1, borderColor: dirty ? C.purple + '44' : C.border }} />
            ) : r.note ? (
              <View style={{ backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <Text style={{ color: C.text2, fontSize: 14, lineHeight: 20 }}>{r.note}</Text>
              </View>
            ) : null}

            {/* Meta card */}
            <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, gap: 10, marginBottom: 16 }}>
              {r.due_date && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 16, width: 22, textAlign: 'center' }}>⏰</Text>
                  <View>
                    <Text style={{ fontSize: 10, color: C.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Due</Text>
                    <Text style={{ fontSize: 13, color: C.text }}>{moment(r.due_date).format('ddd, MMM D YYYY · h:mm A')}</Text>
                  </View>
                </View>
              )}
              {forUser && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{forUser.avatar || '👤'}</Text>
                  <View>
                    <Text style={{ fontSize: 10, color: C.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Assigned to</Text>
                    <Text style={{ fontSize: 13, color: forUser.color || C.text }}>{forUser.name}{isAssignee ? ' (You)' : ''}</Text>
                  </View>
                </View>
              )}
              {fromUser && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{fromUser.avatar || '✍️'}</Text>
                  <View>
                    <Text style={{ fontSize: 10, color: C.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Created by</Text>
                    <Text style={{ fontSize: 13, color: C.text }}>{fromUser.name}{creatorId === currentUser?.id ? ' (You)' : ''}</Text>
                  </View>
                </View>
              )}
              {isAssignee && r.status === 'rejected' && !!r.rejection_reason && (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={{ fontSize: 16, width: 22, textAlign: 'center' }}>❌</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: '#EF4444', textTransform: 'uppercase', letterSpacing: 0.4 }}>Rejection Reason</Text>
                    <Text style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{r.rejection_reason}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Save */}
            {dirty && (
              <TouchableOpacity onPress={saveChanges} disabled={saving} style={{
                backgroundColor: C.purple, borderRadius: 10, padding: 12,
                alignItems: 'center', marginBottom: 10, opacity: saving ? 0.6 : 1,
              }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={{ gap: 8 }}>
              {isAssignee && r.status === 'pending' && (
                <TouchableOpacity onPress={() => { onAction(r.id, markDoneStatus); onClose(); }} style={{
                  backgroundColor: '#92400E22', borderWidth: 1, borderColor: '#92400E66',
                  borderRadius: 10, padding: 13, alignItems: 'center',
                }}>
                  <Text style={{ color: '#FBBF24', fontWeight: '700' }}>✓  {markDoneLabel}</Text>
                </TouchableOpacity>
              )}
              {iCanReview && !showReassignEdit && (
                <View style={{ gap: 8 }}>
                  {!showRejectInput ? (
                    <>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => { onAction(r.id, 'approved'); onClose(); }} style={{
                          flex: 1, backgroundColor: '#065F4622', borderWidth: 1, borderColor: '#065F4666',
                          borderRadius: 10, padding: 13, alignItems: 'center',
                        }}>
                          <Text style={{ color: '#34D399', fontWeight: '700' }}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowRejectInput(true)} style={{
                          flex: 1, backgroundColor: '#7F1D1D22', borderWidth: 1, borderColor: '#7F1D1D66',
                          borderRadius: 10, padding: 13, alignItems: 'center',
                        }}>
                          <Text style={{ color: '#FCA5A5', fontWeight: '700' }}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => { setReassignTitle(r.title || ''); setReassignNote(r.note || ''); setShowReassignEdit(true); }}
                        style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.blue + '55', borderRadius: 10, padding: 13, alignItems: 'center' }}>
                        <Text style={{ color: C.blue, fontWeight: '600' }}>↩  Reassign (Reactivate)</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <TextInput
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        placeholder="Reason for rejection..."
                        placeholderTextColor={C.text4}
                        style={{ backgroundColor: C.card, borderRadius: 10, padding: 12, color: C.text, borderWidth: 1, borderColor: '#EF444466', fontSize: 13 }}
                      />
                      <TouchableOpacity
                        onPress={() => { onAction(r.id, 'rejected', rejectReason); setShowRejectInput(false); onClose(); }}
                        style={{ backgroundColor: '#7F1D1D33', borderWidth: 1, borderColor: '#EF444466', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#EF4444', fontWeight: '700' }}>Confirm Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setShowRejectInput(false)} style={{ alignItems: 'center', padding: 10 }}>
                        <Text style={{ color: C.text4, fontSize: 13 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              {iCanReview && showReassignEdit && (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 10, color: C.text4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Edit Before Reactivating</Text>
                  <TextInput
                    value={reassignTitle}
                    onChangeText={setReassignTitle}
                    placeholder="Task title..."
                    placeholderTextColor={C.text4}
                    style={{ fontSize: 15, fontWeight: '600', color: C.text, backgroundColor: C.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.purple + '66' }}
                  />
                  <TextInput
                    value={reassignNote}
                    onChangeText={setReassignNote}
                    placeholder="Add instructions or notes..."
                    placeholderTextColor={C.text4}
                    multiline
                    style={{ backgroundColor: C.card, borderRadius: 10, padding: 12, color: C.text, minHeight: 72, fontSize: 13, borderWidth: 1, borderColor: C.border }}
                  />
                  <TouchableOpacity onPress={saveAndReactivate} disabled={reassigning} style={{
                    backgroundColor: C.blue + '22', borderWidth: 1, borderColor: C.blue + '66',
                    borderRadius: 10, padding: 13, alignItems: 'center', opacity: reassigning ? 0.6 : 1,
                  }}>
                    <Text style={{ color: C.blue, fontWeight: '700' }}>{reassigning ? 'Reactivating…' : '↩  Save & Reactivate'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowReassignEdit(false)} style={{ alignItems: 'center', padding: 10 }}>
                    <Text style={{ color: C.text4, fontSize: 13 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MyRemindersScreen() {
  const { currentUser, users, reminderSignal, clearReminderUnread } = useApp();
  const [reminders,  setReminders]  = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [detailRem,  setDetailRem]  = useState(null);
  const [lastSeenTs, setLastSeenTs] = useState(null);

  const load = async () => {
    try {
      const r = await getReminders('all');
      const sorted = (r.data || []).sort((a, b) =>
        new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at),
      );
      setReminders(sorted);
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    const run = async () => {
      const saved = await AsyncStorage.getItem(LAST_SEEN_KEY);
      setLastSeenTs(saved ? new Date(saved) : null);
      await load();
      await AsyncStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
      clearReminderUnread();
    };
    run();
  }, []));
  useEffect(() => { load(); }, [reminderSignal]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAction = async (id, status, rejection_reason) => {
    try { await setReminderStatus(id, status, rejection_reason); setDetailRem(null); load(); }
    catch { Alert.alert('Error', 'Could not update'); }
  };

  // Badge counts
  const needsAction = reminders.filter(r => {
    const forUserId = getRefId(r.for_user_id);
    const creatorId = getRefId(r.created_by);
    if (r.status === 'pending' && forUserId === currentUser?.id) return true;
    if (r.status === 'review' && creatorId === currentUser?.id) return true;
    return false;
  }).length;

  return (
    <Screen>
      {needsAction > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', marginRight: 8 }} />
          <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '700' }}>
            {needsAction} item{needsAction !== 1 ? 's' : ''} need{needsAction === 1 ? 's' : ''} your attention
          </Text>
        </View>
      )}

      <FlatList
        data={reminders}
        keyExtractor={r => r.id || r._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
        renderItem={({ item }) => (
          <NotifItem
            r={item}
            me={currentUser?.id}
            onPress={setDetailRem}
            isUnseen={lastSeenTs ? new Date(item.updated_at || item.created_at) > lastSeenTs : false}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 36 }}>🔔</Text>
            <Text style={[T.sm, { marginTop: 10 }]}>No reminders yet</Text>
          </View>
        }
      />

      <QuickDetailSheet
        r={detailRem}
        users={users}
        currentUser={currentUser}
        onClose={() => setDetailRem(null)}
        onAction={handleAction}
        onDataChange={load}
      />
    </Screen>
  );
}
