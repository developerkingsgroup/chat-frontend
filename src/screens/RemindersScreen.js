// src/screens/RemindersScreen.js
import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useApp} from '../context/AppContext';
import {
  getReminders,
  createReminder,
  updateReminder,
  setReminderStatus,
  deleteReminder,
} from '../utils/api';
import {
  C,
  T,
  Screen,
  SectionLabel,
  Field,
  PRIORITY,
  STATUS,
} from '../components/UI';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';

// Safely extract string ID from a potentially-populated Mongoose ref field
const getRefId = (f) => {
  if (!f) return '';
  if (typeof f === 'object') return f.id || f._id || '';
  return f;
};

// Resolve display user from a populated or plain-ID field
const resolveUser = (field, users) => {
  if (!field) return null;
  if (typeof field === 'object') return field;
  return users.find(u => u.id === field) || null;
};

// ── Reminder Card (iOS Style) ──────────────────────────────────────────────────
function RCard({r, onPress}) {
  const pr = PRIORITY[r.priority] || PRIORITY.medium;
  const isDone = r.status === 'approved' || r.status === 'rejected';

  return (
    <TouchableOpacity
      onPress={() => onPress(r)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 16,
        backgroundColor: C.bg, borderBottomWidth: 0.5, borderBottomColor: C.border,
      }}>
      <View style={{
        width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
        borderColor: isDone ? C.text4 : pr.color,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
        backgroundColor: isDone ? C.text4 + '22' : 'transparent',
      }}>
        {isDone && <Text style={{fontSize: 12, color: C.text4}}>✓</Text>}
      </View>
      <View style={{flex: 1}}>
        <Text style={{
          fontSize: 16, fontWeight: '400',
          color: isDone ? C.text4 : C.text,
          textDecorationLine: isDone ? 'line-through' : 'none',
        }} numberOfLines={1}>{r.title}</Text>
        {r.due_date && (
          <Text style={{fontSize: 13, color: isDone ? C.text4 : C.blue, marginTop: 2}}>
            {moment(r.due_date).format('ddd, MMM D · h:mm A')}
          </Text>
        )}
      </View>
      <Text style={{fontSize: 14, color: C.text4}}>›</Text>
    </TouchableOpacity>
  );
}

// ── Review Card with inline Approve / Reject / Reassign ───────────────────────
function ReviewCard({r, currentUser, users, onPress, onApprove, onReject, onReassign}) {
  const [showReject,   setShowReject]   = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const forUser = resolveUser(r.for_user_id, users);

  return (
    <View style={{borderBottomWidth: 0.5, borderBottomColor: C.border}}>
      <View style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16}}>
        <TouchableOpacity
          onPress={() => onApprove(r.id, 'approved')}
          style={{
            width: 22, height: 22, borderRadius: 11,
            borderWidth: 1.5, borderColor: '#10B981',
            alignItems: 'center', justifyContent: 'center', marginRight: 12,
          }}>
          <Text style={{fontSize: 11, color: '#10B981'}}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPress(r)} style={{flex: 1}}>
          <Text style={{fontSize: 15, color: C.text, fontWeight: '400'}} numberOfLines={1}>{r.title}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 8}}>
            {r.due_date && <Text style={{fontSize: 12, color: C.blue}}>{moment(r.due_date).format('ddd, MMM D · h:mm A')}</Text>}
            {forUser && <Text style={{fontSize: 11, color: C.text3}}>• {forUser.name}</Text>}
          </View>
        </TouchableOpacity>
        <View style={{backgroundColor: '#F59E0B22', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2}}>
          <Text style={{fontSize: 10, fontWeight: '700', color: '#F59E0B'}}>Review</Text>
        </View>
      </View>

      <View style={{flexDirection: 'row', gap: 8, paddingHorizontal: 50, paddingBottom: 10}}>
        <TouchableOpacity
          onPress={() => { setShowReject(v => !v); setRejectReason(''); }}
          style={{paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#EF444466', backgroundColor: '#EF444411'}}>
          <Text style={{fontSize: 11, fontWeight: '700', color: '#EF4444'}}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onReassign(r.id)}
          style={{paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.blue + '66', backgroundColor: C.blue + '11'}}>
          <Text style={{fontSize: 11, fontWeight: '700', color: C.blue}}>Reassign</Text>
        </TouchableOpacity>
      </View>

      {showReject && (
        <View style={{paddingHorizontal: 16, paddingBottom: 12}}>
          <TextInput
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="Reason for rejection..."
            placeholderTextColor={C.text4}
            style={{backgroundColor: C.card, borderRadius: 8, padding: 10, color: C.text, borderWidth: 1, borderColor: C.border, marginBottom: 8, fontSize: 13}}
          />
          <TouchableOpacity
            onPress={() => { onReject(r.id, rejectReason); setShowReject(false); setRejectReason(''); }}
            style={{backgroundColor: '#EF444422', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#EF444444'}}>
            <Text style={{color: '#EF4444', fontWeight: '700', fontSize: 12}}>Confirm Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Quick Detail Sheet (bottom sheet, replaces full-page modal) ───────────────
function QuickDetailSheet({r, users, currentUser, onClose, onAction, onSave}) {
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

  const forUserId  = getRefId(r.for_user_id);
  const creatorId  = getRefId(r.created_by);
  const forUser    = resolveUser(r.for_user_id, users);
  const fromUser   = resolveUser(r.created_by, users);
  const isAssignee = forUserId === currentUser?.id;
  const canEdit    = isAssignee && (r.status === 'pending' || r.status === 'rejected');
  const iCanReview = r.status === 'review' && (
    creatorId === currentUser?.id ||
    currentUser?.is_super_admin ||
    ['Manager', 'General'].some(k => (currentUser?.role || '').includes(k))
  );

  const pr = PRIORITY[r.priority] || PRIORITY.medium;
  const st = STATUS[r.status]     || STATUS.pending;

  const saveChanges = async () => {
    if (!editTitle.trim()) { Alert.alert('Error', 'Title cannot be empty'); return; }
    setSaving(true);
    try {
      await updateReminder(r.id, {title: editTitle.trim(), note: editNote});
      setDirty(false);
      onSave?.();
    } catch { Alert.alert('Error', 'Could not save'); }
    finally { setSaving(false); }
  };

  const saveAndReactivate = async () => {
    if (!reassignTitle.trim()) { Alert.alert('Error', 'Title cannot be empty'); return; }
    setReassigning(true);
    try {
      await updateReminder(r.id, {title: reassignTitle.trim(), note: reassignNote});
      await setReminderStatus(r.id, 'pending');
      onSave?.();
      onClose();
    } catch { Alert.alert('Error', 'Could not reactivate'); }
    finally { setReassigning(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}} onPress={onClose}>
        <Pressable onPress={() => {}} style={{backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%'}}>
          {/* Drag handle */}
          <View style={{alignItems: 'center', paddingTop: 10, paddingBottom: 4}}>
            <View style={{width: 38, height: 4, backgroundColor: C.border2, borderRadius: 2}} />
          </View>

          <ScrollView contentContainerStyle={{padding: 16, paddingTop: 8}} keyboardShouldPersistTaps="handled">
            {/* Priority + Status badges */}
            <View style={{flexDirection: 'row', gap: 8, marginBottom: 14}}>
              <View style={{backgroundColor: pr.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999}}>
                <Text style={{color: pr.color, fontWeight: '700', fontSize: 11}}>{pr.icon} {pr.label}</Text>
              </View>
              <View style={{backgroundColor: st.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999}}>
                <Text style={{color: st.color, fontWeight: '700', fontSize: 11}}>{st.icon} {st.label}</Text>
              </View>
            </View>

            {/* Title */}
            {canEdit ? (
              <TextInput
                value={editTitle}
                onChangeText={v => { setEditTitle(v); setDirty(true); }}
                style={{
                  fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 10,
                  borderBottomWidth: 1.5, borderBottomColor: dirty ? C.purple + 'AA' : C.border,
                  paddingBottom: 4,
                }}
                multiline
                placeholder="Reminder title..."
                placeholderTextColor={C.text4}
              />
            ) : (
              <Text style={{fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 10}}>{r.title}</Text>
            )}

            {/* Note */}
            {canEdit ? (
              <TextInput
                value={editNote}
                onChangeText={v => { setEditNote(v); setDirty(true); }}
                placeholder="Add a description..."
                placeholderTextColor={C.text4}
                multiline
                style={{
                  backgroundColor: C.card, borderRadius: 10, padding: 12,
                  color: C.text, minHeight: 64, marginBottom: 14, fontSize: 14,
                  borderWidth: 1, borderColor: dirty ? C.purple + '44' : C.border,
                }}
              />
            ) : r.note ? (
              <View style={{backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 14}}>
                <Text style={{color: C.text2, fontSize: 14, lineHeight: 20}}>{r.note}</Text>
              </View>
            ) : null}

            {/* Meta info card */}
            <View style={{borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, gap: 10, marginBottom: 16}}>
              {r.due_date && (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                  <Text style={{fontSize: 16, width: 22, textAlign: 'center'}}>⏰</Text>
                  <View>
                    <Text style={{fontSize: 10, color: C.text4, textTransform: 'uppercase', letterSpacing: 0.4}}>Due</Text>
                    <Text style={{fontSize: 13, color: C.text}}>{moment(r.due_date).format('ddd, MMM D YYYY · h:mm A')}</Text>
                  </View>
                </View>
              )}
              {forUser && (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                  <Text style={{fontSize: 16, width: 22, textAlign: 'center'}}>{forUser.avatar || '👤'}</Text>
                  <View>
                    <Text style={{fontSize: 10, color: C.text4, textTransform: 'uppercase', letterSpacing: 0.4}}>Assigned to</Text>
                    <Text style={{fontSize: 13, color: forUser.color || C.text}}>{forUser.name}{isAssignee ? ' (You)' : ''}</Text>
                  </View>
                </View>
              )}
              {fromUser && (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                  <Text style={{fontSize: 16, width: 22, textAlign: 'center'}}>{fromUser.avatar || '✍️'}</Text>
                  <View>
                    <Text style={{fontSize: 10, color: C.text4, textTransform: 'uppercase', letterSpacing: 0.4}}>Created by</Text>
                    <Text style={{fontSize: 13, color: C.text}}>{fromUser.name}{creatorId === currentUser?.id ? ' (You)' : ''}</Text>
                  </View>
                </View>
              )}
              {isAssignee && r.status === 'rejected' && !!r.rejection_reason && (
                <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: 10}}>
                  <Text style={{fontSize: 16, width: 22, textAlign: 'center'}}>❌</Text>
                  <View style={{flex: 1}}>
                    <Text style={{fontSize: 10, color: '#EF4444', textTransform: 'uppercase', letterSpacing: 0.4}}>Rejection Reason</Text>
                    <Text style={{fontSize: 13, color: C.text, marginTop: 2}}>{r.rejection_reason}</Text>
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
                <Text style={{color: '#fff', fontWeight: '700'}}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
            )}

            {/* Status actions */}
            <View style={{gap: 8}}>
              {isAssignee && r.status === 'pending' && (
                <TouchableOpacity onPress={() => { onAction(r.id, 'review'); onClose(); }} style={{
                  backgroundColor: '#92400E22', borderWidth: 1, borderColor: '#92400E66',
                  borderRadius: 10, padding: 13, alignItems: 'center',
                }}>
                  <Text style={{color: '#FBBF24', fontWeight: '700'}}>✓  Mark as Done</Text>
                </TouchableOpacity>
              )}
              {iCanReview && !showReassignEdit && (
                <View style={{gap: 8}}>
                  {!showRejectInput ? (
                    <>
                      <View style={{flexDirection: 'row', gap: 8}}>
                        <TouchableOpacity onPress={() => { onAction(r.id, 'approved'); onClose(); }} style={{
                          flex: 1, backgroundColor: '#065F4622', borderWidth: 1, borderColor: '#065F4666',
                          borderRadius: 10, padding: 13, alignItems: 'center',
                        }}>
                          <Text style={{color: '#34D399', fontWeight: '700'}}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowRejectInput(true)} style={{
                          flex: 1, backgroundColor: '#7F1D1D22', borderWidth: 1, borderColor: '#7F1D1D66',
                          borderRadius: 10, padding: 13, alignItems: 'center',
                        }}>
                          <Text style={{color: '#FCA5A5', fontWeight: '700'}}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => { setReassignTitle(r.title || ''); setReassignNote(r.note || ''); setShowReassignEdit(true); }}
                        style={{backgroundColor: C.card, borderWidth: 1, borderColor: C.blue + '55', borderRadius: 10, padding: 13, alignItems: 'center'}}>
                        <Text style={{color: C.blue, fontWeight: '600'}}>↩  Reassign (Reactivate)</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={{gap: 8}}>
                      <TextInput
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        placeholder="Reason for rejection..."
                        placeholderTextColor={C.text4}
                        style={{backgroundColor: C.card, borderRadius: 10, padding: 12, color: C.text, borderWidth: 1, borderColor: '#EF444466', fontSize: 13}}
                      />
                      <TouchableOpacity
                        onPress={() => { onAction(r.id, 'rejected', rejectReason); setShowRejectInput(false); onClose(); }}
                        style={{backgroundColor: '#7F1D1D33', borderWidth: 1, borderColor: '#EF444466', borderRadius: 10, padding: 12, alignItems: 'center'}}>
                        <Text style={{color: '#EF4444', fontWeight: '700'}}>Confirm Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setShowRejectInput(false)} style={{alignItems: 'center', padding: 10}}>
                        <Text style={{color: C.text4, fontSize: 13}}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              {iCanReview && showReassignEdit && (
                <View style={{gap: 8}}>
                  <Text style={{fontSize: 10, color: C.text4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5}}>Edit Before Reactivating</Text>
                  <TextInput
                    value={reassignTitle}
                    onChangeText={setReassignTitle}
                    placeholder="Task title..."
                    placeholderTextColor={C.text4}
                    style={{fontSize: 15, fontWeight: '600', color: C.text, backgroundColor: C.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.purple + '66'}}
                  />
                  <TextInput
                    value={reassignNote}
                    onChangeText={setReassignNote}
                    placeholder="Add instructions or notes..."
                    placeholderTextColor={C.text4}
                    multiline
                    style={{backgroundColor: C.card, borderRadius: 10, padding: 12, color: C.text, minHeight: 72, fontSize: 13, borderWidth: 1, borderColor: C.border}}
                  />
                  <TouchableOpacity onPress={saveAndReactivate} disabled={reassigning} style={{
                    backgroundColor: C.blue + '22', borderWidth: 1, borderColor: C.blue + '66',
                    borderRadius: 10, padding: 13, alignItems: 'center', opacity: reassigning ? 0.6 : 1,
                  }}>
                    <Text style={{color: C.blue, fontWeight: '700'}}>{reassigning ? 'Reactivating…' : '↩  Save & Reactivate'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowReassignEdit(false)} style={{alignItems: 'center', padding: 10}}>
                    <Text style={{color: C.text4, fontSize: 13}}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={{height: 24}} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Create Reminder Modal ─────────────────────────────────────────────────────
function CreateReminderModal({visible, users, currentUser, onClose, onSave}) {
  const [title,             setTitle]             = useState('');
  const [note,              setNote]              = useState('');
  const [priority,          setPriority]          = useState('medium');
  const [forUser,           setForUser]           = useState('');
  const [dueDate,           setDueDate]           = useState(new Date());
  const [showDate,          setShowDate]          = useState(false);
  const [userSearch,        setUserSearch]        = useState('');
  const [userSearchFocused, setUserSearchFocused] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setNote('');
    setPriority('medium');
    setForUser('');
    setDueDate(new Date());
    setShowDate(false);
    setUserSearch('');
    setUserSearchFocused(false);
  }, [visible]);

  const save = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Title required'); return; }
    try {
      await createReminder({
        title: title.trim(), note, priority,
        for_user_id: forUser || currentUser?.id,
        due_date: dueDate.toISOString(),
      });
      onSave?.();
    } catch { Alert.alert('Error', 'Could not save'); }
  };

  // User list: default = only self shown; on focus = all; on type = filter all
  const q = userSearch.toLowerCase().trim();
  const filteredUsers = (users || []).filter(u => {
    if (!q && !userSearchFocused) return u.id === currentUser?.id;
    if (!q) return true;
    return u.name?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  const roleGroups = {};
  filteredUsers.forEach(u => {
    const g = u?.is_super_admin ? 'Super Admin' : u?.role || 'User';
    if (!roleGroups[g]) roleGroups[g] = [];
    roleGroups[g].push(u);
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{flex: 1, backgroundColor: C.bg}}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <Text style={T.h2}>New Reminder</Text>
          <TouchableOpacity onPress={onClose} style={{
            backgroundColor: C.card, width: 32, height: 32, borderRadius: 9,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{color: C.text3, fontSize: 16}}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{padding: 16}} keyboardShouldPersistTaps="handled">
          <Field label="Title *" placeholder="e.g. Send monthly report" value={title} onChangeText={setTitle} />
          <Field label="Description" placeholder="Add details…" value={note} onChangeText={setNote}
            multiline numberOfLines={3} inputStyle={{height: 72}} />

          {/* Priority */}
          <Text style={[T.xs, {textTransform: 'uppercase', marginBottom: 8}]}>Priority</Text>
          <View style={{flexDirection: 'row', marginBottom: 14}}>
            {Object.entries(PRIORITY).map(([k, p], i) => {
              const sel = priority === k;
              return (
                <TouchableOpacity key={k} onPress={() => setPriority(k)} activeOpacity={0.85} style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
                  marginRight: i < Object.keys(PRIORITY).length - 1 ? 8 : 0,
                  borderColor: sel ? `${p.color}88` : C.border2,
                  backgroundColor: sel ? p.bg : C.card, alignItems: 'center',
                }}>
                  <Text style={{fontSize: 16}}>{String(p.icon || '')}</Text>
                  <Text style={{marginTop: 4, fontSize: 12, fontWeight: '600', color: sel ? p.color : C.text3}}>
                    {String(p.label || '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Due Date */}
          <Text style={[T.xs, {textTransform: 'uppercase', marginBottom: 8}]}>Due Date</Text>
          <TouchableOpacity onPress={() => setShowDate(true)} style={{
            backgroundColor: C.card, borderRadius: 10, padding: 12,
            borderWidth: 1.5, borderColor: C.border2, marginBottom: 14,
          }}>
            <Text style={{color: C.text, fontSize: 14}}>{moment(dueDate).format('ddd, MMM D YYYY · h:mm A')}</Text>
          </TouchableOpacity>
          {showDate && (
            <View style={{backgroundColor: C.card, borderRadius: 16, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: C.border}}>
              <Calendar
                theme={{
                  backgroundColor: C.card, calendarBackground: C.card,
                  textSectionTitleColor: C.text3, dayTextColor: C.text,
                  monthTextColor: C.text, todayTextColor: '#8B5CF6',
                  selectedDayBackgroundColor: '#8B5CF6', selectedDayTextColor: '#fff',
                  arrowColor: '#8B5CF6',
                }}
                markedDates={{[moment(dueDate).format('YYYY-MM-DD')]: {selected: true}}}
                onDayPress={day => {
                  const d = new Date(day.timestamp);
                  d.setHours(dueDate.getHours()); d.setMinutes(dueDate.getMinutes());
                  setDueDate(d); setShowDate(false);
                }}
              />
            </View>
          )}

          {/* Assign To */}
          <Text style={[T.xs, {textTransform: 'uppercase', marginBottom: 4}]}>Assign To</Text>
          <Text style={{fontSize: 11, color: C.text4, marginBottom: 8}}>
            {forUser && forUser !== currentUser?.id
              ? 'Tap a user to change selection'
              : 'Search or tap to select · defaults to yourself'}
          </Text>

          <Field
            placeholder="Search by name or role…"
            value={userSearch}
            onChangeText={setUserSearch}
            inputStyle={{marginBottom: 12}}
            onFocus={() => setUserSearchFocused(true)}
            onBlur={() => setUserSearchFocused(false)}
          />

          {Object.entries(roleGroups).map(([role, grpUsers]) => (
            <View key={role} style={{marginBottom: 10}}>
              <View style={{
                backgroundColor: '#8B5CF611', borderRadius: 6, paddingHorizontal: 8,
                paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6,
              }}>
                <Text style={{fontSize: 10, fontWeight: '700', color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 0.5}}>
                  {role === 'Super Admin' ? '👑 ' : ''}{String(role)}
                </Text>
              </View>
              {grpUsers.map(u => {
                const sel = forUser === u?.id;
                return (
                  <TouchableOpacity key={String(u?.id)} onPress={() => setForUser(sel ? '' : u?.id)} activeOpacity={0.85}
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: 11,
                      borderRadius: 12, marginBottom: 4, borderWidth: 1.5,
                      borderColor: sel ? `${u?.color || C.blue}66` : C.border,
                      borderLeftWidth: sel ? 3 : 1.5,
                      borderLeftColor: sel ? u?.color || C.blue : C.border,
                      backgroundColor: sel ? C.card : 'transparent',
                    }}>
                    <View style={{
                      width: 34, height: 34, borderRadius: 9,
                      backgroundColor: `${u?.color || C.blue}22`, alignItems: 'center',
                      justifyContent: 'center', borderWidth: 1.5,
                      borderColor: `${u?.color || C.blue}44`, marginRight: 10,
                    }}>
                      <Text style={{fontSize: 18}}>{typeof u?.avatar === 'string' ? u.avatar : '👤'}</Text>
                    </View>
                    <View style={{flex: 1}}>
                      <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'}}>
                        <Text style={{fontSize: 13, fontWeight: '700', color: sel ? C.text : C.text2}}>
                          {String(u?.name || 'Unknown')}
                        </Text>
                        {u?.id === currentUser?.id && (
                          <View style={{backgroundColor: C.border2, borderRadius: 999, paddingHorizontal: 5, marginLeft: 5}}>
                            <Text style={{fontSize: 9, color: C.text4}}>You</Text>
                          </View>
                        )}
                        {u?.is_super_admin && (
                          <View style={{backgroundColor: '#1E3A8A', borderRadius: 999, paddingHorizontal: 5, marginLeft: 5}}>
                            <Text style={{fontSize: 9, fontWeight: '700', color: '#60A5FA'}}>Admin</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[T.xs, {color: u?.is_super_admin ? '#60A5FA' : u?.color || C.text3, marginTop: 2}]}>
                        {u?.is_super_admin ? 'Super Admin' : String(u?.role || 'User')}
                      </Text>
                    </View>
                    <View style={{
                      width: 20, height: 20, borderRadius: 5,
                      backgroundColor: sel ? C.purple : C.card,
                      borderWidth: 1.5, borderColor: sel ? C.purple : C.border2,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sel && <Text style={{fontSize: 11, color: '#fff'}}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={{padding: 14, borderTopWidth: 1, borderTopColor: C.border}}>
          <TouchableOpacity onPress={save} disabled={!title.trim()} activeOpacity={0.85} style={{
            backgroundColor: '#6D28D9', paddingVertical: 14, borderRadius: 12,
            alignItems: 'center', opacity: !title.trim() ? 0.5 : 1,
          }}>
            <Text style={{color: '#fff', fontSize: 15, fontWeight: '700'}}>Set Reminder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Grouped-by-user view (Others + All tabs) ──────────────────────────────────
function GroupedUserView({reminders, users, expandedUsers, setExpandedUsers, currentUser, onOpenDetail}) {
  const byUser = {};
  reminders.forEach(r => {
    const k = getRefId(r.for_user_id);
    if (!k) return;
    if (!byUser[k]) byUser[k] = [];
    byUser[k].push(r);
  });

  const keys = Object.keys(byUser);

  if (keys.length === 0) {
    return (
      <View style={{alignItems: 'center', paddingTop: 60}}>
        <Text style={{fontSize: 32}}>🔔</Text>
        <Text style={[T.sm, {marginTop: 8}]}>No reminders</Text>
      </View>
    );
  }

  return (
    <>
      {keys.map(uid => {
        // Resolve the user — prefer populated data inside the reminder
        const u = resolveUser(reminders.find(r => getRefId(r.for_user_id) === uid)?.for_user_id, users)
               || users.find(x => x.id === uid);
        const isMe      = uid === currentUser?.id;
        const isExpanded = !!expandedUsers[uid];
        const rems      = byUser[uid];

        return (
          <View key={uid} style={{marginBottom: 4}}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpandedUsers(prev => ({...prev, [uid]: !prev[uid]}))}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 9,
                paddingHorizontal: 14, paddingVertical: 10,
                backgroundColor: isExpanded ? C.card : 'transparent',
                borderBottomWidth: isExpanded ? 1 : 0, borderBottomColor: C.border,
              }}>
              <View style={{
                width: 36, height: 36, borderRadius: 9,
                backgroundColor: (u?.color || C.blue) + '22', alignItems: 'center',
                justifyContent: 'center', borderWidth: 1.5, borderColor: (u?.color || C.blue) + '33',
              }}>
                <Text style={{fontSize: 19}}>{u?.avatar || '👤'}</Text>
              </View>
              <View style={{flex: 1}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                  <Text style={{fontSize: 13, fontWeight: '700', color: u?.color || C.blue}}>
                    {u?.name || 'No Name'}
                  </Text>
                  {isMe && (
                    <View style={{backgroundColor: C.border2, borderRadius: 999, paddingHorizontal: 5}}>
                      <Text style={{fontSize: 9, color: C.text4}}>You</Text>
                    </View>
                  )}
                </View>
                <Text style={[T.xs, {color: C.text4, marginTop: 1}]}>
                  {u?.is_super_admin ? 'Super Admin' : u?.role || 'User'}
                </Text>
              </View>
              <View style={{backgroundColor: '#8B5CF622', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6}}>
                <Text style={{fontSize: 10, fontWeight: '700', color: '#A78BFA'}}>{rems.length}</Text>
              </View>
              <Text style={{fontSize: 14, color: C.text4}}>{isExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={{backgroundColor: C.bg, paddingVertical: 4}}>
                {rems.map(r => (
                  <TouchableOpacity key={r.id} onPress={() => onOpenDetail(r)} activeOpacity={0.6} style={{
                    paddingHorizontal: 16, paddingVertical: 12,
                    borderBottomWidth: 0.5, borderBottomColor: C.border,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                      <View style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: PRIORITY[r.priority]?.color || C.blue, marginRight: 10,
                      }} />
                      <Text style={{fontSize: 15, color: C.text, fontWeight: '400'}} numberOfLines={1}>{r.title}</Text>
                    </View>
                    {r.due_date && (
                      <Text style={{fontSize: 12, color: C.text4, marginLeft: 10}}>
                        {moment(r.due_date).format('MMM D')}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

// ── Main Reminders Screen ─────────────────────────────────────────────────────
export default function RemindersScreen({navigation}) {
  const {currentUser, users, reminderSignal} = useApp();
  const [reminders,     setReminders]     = useState([]);
  const [view,          setView]          = useState('mine');
  const [showCreate,    setShowCreate]    = useState(false);
  const [detailRem,     setDetailRem]     = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [expandedUsers, setExpandedUsers] = useState({});

  useEffect(() => {
    navigation.setOptions({ title: '', headerShown: false });
  }, [navigation]);

  const load = async () => {
    try { const r = await getReminders(view); setReminders(r.data); } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, [view]));
  useEffect(() => { load(); }, [reminderSignal]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAction = async (id, status, rejection_reason) => {
    try { await setReminderStatus(id, status, rejection_reason); load(); }
    catch { Alert.alert('Error', 'Could not update'); }
  };

  const handleReject = async (id, reason) => {
    try { await setReminderStatus(id, 'rejected', reason); load(); }
    catch { Alert.alert('Error', 'Could not reject'); }
  };

  const handleReassign = async (id) => {
    try { await setReminderStatus(id, 'pending'); load(); }
    catch { Alert.alert('Error', 'Could not reassign'); }
  };

  const VIEWS = [
    ['mine',   '🙋 Mine'],
    ['others', '👥 Others'],
    ['review', '🔍 Review'],
    ['all',    '🌐 All'],
  ];

  const pending  = reminders.filter(r => r.status === 'pending');
  const reviewCount = reminders.filter(
    r => r.status === 'review' && (
      getRefId(r.created_by) === currentUser?.id ||
      currentUser?.is_super_admin ||
      ['Manager', 'General'].some(k => (currentUser?.role || '').includes(k))
    ),
  ).length;

  return (
    <Screen>
      {/* Tab row + create button */}
      <View style={{flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 5, borderBottomWidth: 1, borderBottomColor: C.border}}>
        {VIEWS.map(([v, l]) => (
          <TouchableOpacity key={v} onPress={() => setView(v)} activeOpacity={0.85} style={{
            flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
            borderColor: v === 'review' && reviewCount > 0 ? '#F59E0B44' : view === v ? '#8B5CF644' : C.border,
            backgroundColor: view === v ? '#8B5CF622' : C.card,
            alignItems: 'center',
          }}>
            <Text style={{fontSize: 11, fontWeight: '700', color: view === v ? '#A78BFA' : C.text3}} numberOfLines={1}>
              {l}{v === 'review' && reviewCount > 0 ? ` (${reviewCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setShowCreate(true)} style={{
          width: 34, height: 34, borderRadius: 9,
          backgroundColor: '#6D28D922', alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: '#6D28D933',
        }}>
          <Text style={{fontSize: 20, color: '#A78BFA', lineHeight: 24}}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}>

        {/* ── Mine ── */}
        {view === 'mine' && (
          <>
            {pending.length === 0 ? (
              <View style={{alignItems: 'center', paddingTop: 60}}>
                <Text style={{fontSize: 32}}>🔔</Text>
                <Text style={[T.sm, {marginTop: 8}]}>No pending reminders</Text>
              </View>
            ) : (
              <>
                <SectionLabel text="Pending" count={pending.length} />
                {pending.map(r => <RCard key={r.id} r={r} onPress={setDetailRem} />)}
              </>
            )}
          </>
        )}

        {/* ── Others ── */}
        {view === 'others' && (
          <GroupedUserView
            reminders={reminders.filter(r => r.status !== 'review')} users={users} currentUser={currentUser}
            expandedUsers={expandedUsers} setExpandedUsers={setExpandedUsers}
            onOpenDetail={setDetailRem}
          />
        )}

        {/* ── Review ── */}
        {view === 'review' && (
          <>
            {reminders.length === 0 ? (
              <View style={{alignItems: 'center', paddingTop: 60}}>
                <Text style={{fontSize: 32}}>✅</Text>
                <Text style={[T.sm, {marginTop: 8}]}>No pending reviews</Text>
              </View>
            ) : (
              <>
                <SectionLabel text="Awaiting Your Review" count={reminders.length} />
                {reminders.map(r => (
                  <ReviewCard key={r.id} r={r} currentUser={currentUser} users={users}
                    onPress={setDetailRem} onApprove={handleAction}
                    onReject={handleReject} onReassign={handleReassign}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* ── All ── */}
        {view === 'all' && (
          <GroupedUserView
            reminders={reminders.filter(r => r.status !== 'review')} users={users} currentUser={currentUser}
            expandedUsers={expandedUsers} setExpandedUsers={setExpandedUsers}
            onOpenDetail={setDetailRem}
          />
        )}

        <View style={{height: 30}} />
      </ScrollView>

      <QuickDetailSheet
        r={detailRem}
        users={users}
        currentUser={currentUser}
        onClose={() => setDetailRem(null)}
        onAction={handleAction}
        onSave={() => { setDetailRem(null); load(); }}
      />

      <CreateReminderModal
        visible={showCreate}
        users={users}
        currentUser={currentUser}
        onClose={() => setShowCreate(false)}
        onSave={() => { setShowCreate(false); load(); }}
      />
    </Screen>
  );
}
