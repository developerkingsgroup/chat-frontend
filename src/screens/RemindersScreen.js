// src/screens/RemindersScreen.js
import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
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
  Avatar,
  Pill,
  Screen,
  SectionLabel,
  PrimaryBtn,
  Field,
  PRIORITY,
  STATUS,
  Card,
} from '../components/UI';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';

// ── Reminder Card (iOS Style) ──────────────────────────────────────────────────
function RCard({r, currentUser, users, onPress, onAction}) {
  const forUser = users.find(u => u.id === r.for_user_id);
  const pr = PRIORITY[r.priority] || PRIORITY.medium;
  const isDone = r.status === 'approved' || r.status === 'rejected';
  const isReview = r.status === 'review';

  return (
    <TouchableOpacity
      onPress={() => onPress(r)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: C.bg,
        borderBottomWidth: 0.5,
        borderBottomColor: C.border,
      }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: isDone ? C.text4 : isReview ? '#F59E0B' : pr.color,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: isDone ? C.text4 + '22' : 'transparent',
        }}>
        {isDone && <Text style={{fontSize: 12, color: C.text4}}>✓</Text>}
      </View>

      <View style={{flex: 1}}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '400',
            color: isDone ? C.text4 : C.text,
            textDecorationLine: isDone ? 'line-through' : 'none',
          }}
          numberOfLines={1}>
          {r.title}
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
          {r.due_date && (
            <Text style={{fontSize: 13, color: isDone ? C.text4 : C.blue}}>
              {moment(r.due_date).format('ddd, MMM D · h:mm A')}
            </Text>
          )}
          {forUser && !isDone && (
            <Text style={{fontSize: 12, color: C.text3, marginLeft: 8}}>
              • {forUser.name}
            </Text>
          )}
        </View>
      </View>

      <Text style={{fontSize: 14, color: C.text4}}>›</Text>
    </TouchableOpacity>
  );
}

// ── Review Card with inline Approve / Reject / Reassign ───────────────────────
function ReviewCard({r, currentUser, users, onPress, onApprove, onReject, onReassign}) {
  const [showReject,    setShowReject]    = useState(false);
  const [rejectReason,  setRejectReason]  = useState('');
  const [showReassign,  setShowReassign]  = useState(false);
  const forUser = users.find(u => u.id === r.for_user_id);
  const pr = PRIORITY[r.priority] || PRIORITY.medium;

  return (
    <View style={{borderBottomWidth: 0.5, borderBottomColor: C.border}}>
      {/* Main row */}
      <View style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16}}>
        {/* Approve circle */}
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
            {r.due_date && (
              <Text style={{fontSize: 12, color: C.blue}}>{moment(r.due_date).format('ddd, MMM D · h:mm A')}</Text>
            )}
            {forUser && <Text style={{fontSize: 11, color: C.text3}}>• {forUser.name}</Text>}
          </View>
        </TouchableOpacity>

        <View style={{backgroundColor: '#F59E0B22', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2}}>
          <Text style={{fontSize: 10, fontWeight: '700', color: '#F59E0B'}}>Review</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={{flexDirection: 'row', gap: 8, paddingHorizontal: 50, paddingBottom: 10}}>
        <TouchableOpacity
          onPress={() => { setShowReject(v => !v); setShowReassign(false); setRejectReason(''); }}
          style={{
            paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
            borderWidth: 1, borderColor: '#EF444466', backgroundColor: '#EF444411',
          }}>
          <Text style={{fontSize: 11, fontWeight: '700', color: '#EF4444'}}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setShowReassign(v => !v); setShowReject(false); }}
          style={{
            paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
            borderWidth: 1, borderColor: C.blue + '66', backgroundColor: C.blue + '11',
          }}>
          <Text style={{fontSize: 11, fontWeight: '700', color: C.blue}}>Reassign</Text>
        </TouchableOpacity>
      </View>

      {/* Reject input */}
      {showReject && (
        <View style={{paddingHorizontal: 16, paddingBottom: 12}}>
          <TextInput
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="Reason for rejection..."
            placeholderTextColor={C.text4}
            style={{
              backgroundColor: C.card, borderRadius: 8, padding: 10,
              color: C.text, borderWidth: 1, borderColor: C.border,
              marginBottom: 8, fontSize: 13,
            }}
          />
          <TouchableOpacity
            onPress={() => { onReject(r.id, rejectReason); setShowReject(false); setRejectReason(''); }}
            style={{
              backgroundColor: '#EF444422', borderRadius: 8, padding: 8,
              alignItems: 'center', borderWidth: 1, borderColor: '#EF444444',
            }}>
            <Text style={{color: '#EF4444', fontWeight: '700', fontSize: 12}}>Confirm Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reassign user picker */}
      {showReassign && (
        <View style={{paddingHorizontal: 16, paddingBottom: 12}}>
          <Text style={{fontSize: 11, color: C.text4, marginBottom: 6, fontWeight: '600'}}>REASSIGN TO</Text>
          <ScrollView nestedScrollEnabled style={{maxHeight: 180}}>
            {users.filter(u => u.id !== r.for_user_id && u.id !== currentUser?.id).map(u => (
              <TouchableOpacity
                key={u.id}
                onPress={() => { onReassign(r.id, u.id); setShowReassign(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  padding: 8, borderRadius: 8, marginBottom: 4, backgroundColor: C.card,
                }}>
                <Text style={{fontSize: 16}}>{u.avatar || '👤'}</Text>
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 13, color: C.text, fontWeight: '600'}}>{u.name}</Text>
                  <Text style={{fontSize: 11, color: C.text3}}>{u.role || 'User'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── Reminder Detail Modal (Read Only) ─────────────────────────────────────────
function ReminderDetailModal({visible, r, users, currentUser, onClose, onEdit, onAction}) {
  if (!r) return null;
  const forUser = users.find(u => u.id === r.for_user_id);
  const fromUser = users.find(u => u.id === r.created_by);
  const isAssignee = r.for_user_id === currentUser?.id;
  const pr = PRIORITY[r.priority] || PRIORITY.medium;
  const st = STATUS[r.status] || STATUS.pending;

  const iCanReview =
    r.status === 'review' &&
    (r.created_by === currentUser?.id ||
      currentUser?.is_super_admin ||
      ['Manager', 'General'].some(k => (currentUser?.role || '').includes(k)));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{flex: 1, backgroundColor: C.bg}}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, borderBottomWidth: 1, borderBottomColor: C.border
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{color: C.purple, fontSize: 17, fontWeight: '600'}}>Done</Text>
          </TouchableOpacity>
          <Text style={T.h3}>Reminder Details</Text>
          <TouchableOpacity onPress={() => { onClose(); onEdit(r); }}>
            <Text style={{color: C.purple, fontSize: 17, fontWeight: '600'}}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{padding: 20}}>
          <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
            <View style={{backgroundColor: pr.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20}}>
              <Text style={{color: pr.color, fontWeight: '700', fontSize: 12}}>{pr.icon} {pr.label} Priority</Text>
            </View>
            <View style={{backgroundColor: st.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20}}>
              <Text style={{color: st.color, fontWeight: '700', fontSize: 12}}>{st.icon} {st.label}</Text>
            </View>
          </View>

          <Text style={{fontSize: 24, fontWeight: '700', color: C.text, marginBottom: 8}}>{r.title}</Text>

          {r.due_date && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 32, marginRight: 10}}>⏰</Text>
              <View>
                <Text style={{fontSize: 16, fontWeight: '600', color: C.text}}>{moment(r.due_date).format('dddd, MMMM Do YYYY')}</Text>
                <Text style={{fontSize: 14, color: C.text3}}>{moment(r.due_date).format('h:mm A')}</Text>
              </View>
            </View>
          )}

          {r.note ? (
            <View style={{backgroundColor: C.card, padding: 16, borderRadius: 12, marginBottom: 20}}>
              <Text style={{fontSize: 12, fontWeight: '700', color: C.text4, textTransform: 'uppercase', marginBottom: 6}}>Note</Text>
              <Text style={{fontSize: 15, color: C.text2, lineHeight: 22}}>{r.note}</Text>
            </View>
          ) : null}

          <View style={{gap: 12}}>
            <DetailRow label="Assigned To" user={forUser} isYou={isAssignee} />
            <DetailRow label="Created By" user={fromUser} isYou={r.created_by === currentUser?.id} />
          </View>

          <View style={{marginTop: 30, gap: 12}}>
            {isAssignee && r.status === 'pending' && (
              <PrimaryBtn
                text="Mark as Done & Send for Review"
                onPress={() => { onAction(r.id, 'review'); onClose(); }}
                style={{backgroundColor: '#92400E'}}
              />
            )}

            {iCanReview && (
              <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity
                  onPress={() => { onAction(r.id, 'approved'); onClose(); }}
                  style={{flex:1, backgroundColor: '#065F46', padding: 14, borderRadius: 12, alignItems:'center'}}>
                  <Text style={{color:'#fff', fontWeight:'700'}}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { onAction(r.id, 'rejected'); onClose(); }}
                  style={{flex:1, backgroundColor: '#7F1D1D', padding: 14, borderRadius: 12, alignItems:'center'}}>
                  <Text style={{color:'#fff', fontWeight:'700'}}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}

            {isAssignee && r.status === 'rejected' && (
              <PrimaryBtn
                text="Revise & Resubmit"
                onPress={() => { onAction(r.id, 'pending'); onClose(); }}
                style={{backgroundColor: C.border2}}
                textStyle={{color: C.text}}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function DetailRow({label, user, isYou}) {
  if (!user) return null;
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8}}>
      <Text style={{fontSize: 14, color: C.text3}}>{label}</Text>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <Text style={{fontSize: 14, fontWeight: '600', color: C.text}}>{user.name} {isYou ? '(You)' : ''}</Text>
        <Text style={{fontSize: 18}}>{user.avatar || '👤'}</Text>
      </View>
    </View>
  );
}

// ── Create/Edit Modal ─────────────────────────────────────────────────────────
function ReminderModal({visible, reminder, users, currentUser, onClose, onSave}) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('medium');
  const [forUser, setForUser] = useState(currentUser?.id || '');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [userSearch,        setUserSearch]        = useState('');
  const [userSearchFocused, setUserSearchFocused] = useState(false);

  useEffect(() => {
    setUserSearch('');
    if (reminder) {
      setTitle(reminder.title || '');
      setNote(reminder.note || '');
      setPriority(reminder.priority || 'medium');
      setForUser(reminder.for_user_id || currentUser?.id || '');
      setDueDate(reminder.due_date ? new Date(reminder.due_date) : new Date());
    } else {
      setTitle('');
      setNote('');
      setPriority('medium');
      setForUser(currentUser?.id || '');
      setDueDate(new Date());
    }
  }, [reminder, visible, currentUser]);

  const save = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Title required'); return; }
    const data = {
      title: title.trim(), note, priority,
      for_user_id: forUser, due_date: dueDate.toISOString(),
    };
    try {
      if (reminder) { await updateReminder(reminder.id, data); }
      else { await createReminder(data); }
      onSave?.();
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not save');
    }
  };

  const del = async () => {
    Alert.alert('Delete', 'Delete this reminder?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteReminder(reminder.id); onSave?.(); }
        catch (e) { Alert.alert('Error', 'Could not delete'); }
      }},
    ]);
  };

  // Default: only show self. On search focus: show all. On search text: filter all.
  const filteredUsers = (users || []).filter(u => {
    const q = userSearch.toLowerCase().trim();
    if (!q && !userSearchFocused) return u.id === currentUser?.id;
    if (!q) return true;
    return u.name?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  const roleGroups = {};
  filteredUsers.forEach(u => {
    const roleName = u?.is_super_admin ? 'Super Admin' : u?.role || 'User';
    if (!roleGroups[roleName]) roleGroups[roleName] = [];
    roleGroups[roleName].push(u);
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{flex: 1, backgroundColor: C.bg}}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <Text style={T.h2}>{reminder ? 'Edit Reminder' : 'New Reminder'}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {reminder ? (
              <TouchableOpacity onPress={del} style={{
                backgroundColor: '#2D1515', paddingHorizontal: 12, paddingVertical: 6,
                borderRadius: 9, marginRight: 8,
              }}>
                <Text style={{color: C.red, fontWeight: '600'}}>Delete</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onClose} style={{
              backgroundColor: C.card, width: 32, height: 32, borderRadius: 9,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{color: C.text3, fontSize: 16}}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{padding: 16}}>
          <Field label="Reminder Title *" placeholder="e.g. Send monthly report" value={title} onChangeText={setTitle} />
          <Field label="Note (Optional)" placeholder="Add more details…" value={note} onChangeText={setNote}
            multiline numberOfLines={3} inputStyle={{height: 72}} />

          <Text style={[T.xs, {textTransform: 'uppercase', marginBottom: 8}]}>Priority</Text>
          <View style={{flexDirection: 'row', marginBottom: 14}}>
            {Object.entries(PRIORITY).map(([k, p], index) => {
              const selected = priority === k;
              return (
                <TouchableOpacity key={k} onPress={() => setPriority(k)} activeOpacity={0.85} style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
                  marginRight: index !== Object.entries(PRIORITY).length - 1 ? 8 : 0,
                  borderColor: selected ? `${p.color}88` : C.border2,
                  backgroundColor: selected ? p.bg : C.card, alignItems: 'center',
                }}>
                  <Text style={{fontSize: 16}}>{String(p.icon || '')}</Text>
                  <Text style={{marginTop: 4, fontSize: 12, fontWeight: '600', color: selected ? p.color : C.text3}}>
                    {String(p.label || '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[T.xs, {textTransform: 'uppercase', marginBottom: 8}]}>Due Date & Time</Text>
          <TouchableOpacity onPress={() => setShowDate(true)} style={{
            backgroundColor: C.card, borderRadius: 10, padding: 12,
            borderWidth: 1.5, borderColor: C.border2, marginBottom: 14,
          }}>
            <Text style={{color: C.text, fontSize: 14}}>{moment(dueDate).format('ddd, MMM D YYYY · h:mm A')}</Text>
          </TouchableOpacity>

          {showDate && (
            <View style={{
              backgroundColor: C.card, borderRadius: 16, padding: 12,
              marginBottom: 14, borderWidth: 1, borderColor: C.border,
            }}>
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
                  const selected = new Date(day.timestamp);
                  selected.setHours(dueDate.getHours());
                  selected.setMinutes(dueDate.getMinutes());
                  setDueDate(selected);
                  setShowDate(false);
                }}
              />
            </View>
          )}

          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
            <Text style={[T.xs, {textTransform: 'uppercase'}]}>Assign To</Text>
            {userSearch ? (
              <TouchableOpacity onPress={() => setUserSearch('')}>
                <Text style={{fontSize: 10, color: C.purple, fontWeight: '700'}}>CLEAR SEARCH</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Field placeholder="Search users by name or role..." value={userSearch}
            onChangeText={setUserSearch} inputStyle={{marginBottom: 12}}
            onFocus={() => setUserSearchFocused(true)}
            onBlur={() => setUserSearchFocused(false)} />

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
                const selected = forUser === u?.id;
                return (
                  <TouchableOpacity key={String(u?.id)} onPress={() => setForUser(u?.id)} activeOpacity={0.85}
                    style={{
                      flexDirection: 'row', alignItems: 'flex-start', padding: 11,
                      borderRadius: 12, marginBottom: 4, borderWidth: 1.5,
                      borderColor: selected ? `${u?.color || C.blue}66` : C.border,
                      borderLeftWidth: selected ? 3 : 1.5,
                      borderLeftColor: selected ? u?.color || C.blue : C.border,
                      backgroundColor: selected ? C.card : 'transparent',
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
                        <Text style={{fontSize: 13, fontWeight: '700', color: selected ? C.text : C.text2}}>
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
                      backgroundColor: selected ? C.purple : C.card,
                      borderWidth: 1.5, borderColor: selected ? C.purple : C.border2,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <Text style={{fontSize: 11, color: '#fff'}}>✓</Text>}
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
            <Text style={{color: '#fff', fontSize: 15, fontWeight: '700'}}>
              {reminder ? 'Save Changes' : 'Set Reminder'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Grouped-by-user view (shared between Others and All tabs) ─────────────────
function GroupedUserView({reminders, users, currentUser, otherSearch, setOtherSearch, expandedUsers, setExpandedUsers, onOpenDetail}) {
  const byUser = {};
  reminders.forEach(r => {
    const k = r.for_user_id;
    if (!byUser[k]) byUser[k] = [];
    byUser[k].push(r);
  });

  const filteredKeys = Object.keys(byUser).filter(uid => {
    if (!otherSearch.trim()) return true;
    const u = users.find(x => x.id === uid);
    return u?.name?.toLowerCase().includes(otherSearch.toLowerCase());
  });

  return (
    <>
      <View style={{paddingHorizontal: 12, paddingBottom: 10}}>
        <Field
          placeholder="Search users..."
          value={otherSearch}
          onChangeText={setOtherSearch}
          inputStyle={{backgroundColor: C.card, borderRadius: 10}}
        />
      </View>

      {filteredKeys.length === 0 ? (
        <View style={{alignItems: 'center', paddingTop: 60}}>
          <Text style={{fontSize: 32}}>🔔</Text>
          <Text style={[T.sm, {marginTop: 8}]}>No users found</Text>
        </View>
      ) : (
        filteredKeys.map(uid => {
          const u = users.find(x => x.id === uid);
          const isMe = uid === currentUser?.id;
          const isExpanded = !!expandedUsers[uid];
          const rems = byUser[uid];

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
                  backgroundColor: (u?.color || C.blue) + '22',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1.5, borderColor: (u?.color || C.blue) + '33',
                }}>
                  <Text style={{fontSize: 19}}>{u?.avatar || '👤'}</Text>
                </View>
                <View style={{flex: 1}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                    <Text style={{fontSize: 13, fontWeight: '700', color: u?.color || C.blue}}>
                      {u?.name || 'Unknown'}
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
                <View style={{
                  backgroundColor: '#8B5CF622', borderRadius: 999,
                  paddingHorizontal: 8, paddingVertical: 2, marginRight: 6,
                }}>
                  <Text style={{fontSize: 10, fontWeight: '700', color: '#A78BFA'}}>{rems.length}</Text>
                </View>
                <Text style={{fontSize: 14, color: C.text4}}>{isExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={{backgroundColor: C.bg, paddingVertical: 4}}>
                  {rems.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => onOpenDetail(r)}
                      activeOpacity={0.6}
                      style={{
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
                        <Text style={{fontSize: 13, color: C.text4, marginLeft: 10}}>
                          {moment(r.due_date).format('h:mm A')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </>
  );
}

// ── Main Reminders Screen ─────────────────────────────────────────────────────
export default function RemindersScreen({navigation}) {
  const {currentUser, users, reminderSignal} = useApp();
  const [reminders,       setReminders]       = useState([]);
  const [view,            setView]            = useState('mine');
  const [showModal,       setShowModal]       = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editRem,         setEditRem]         = useState(null);
  const [selectedRem,     setSelectedRem]     = useState(null);
  const [refreshing,      setRefreshing]      = useState(false);
  const [otherSearch,     setOtherSearch]     = useState('');
  const [expandedUsers,   setExpandedUsers]   = useState({});

  // + button in header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => { setEditRem(null); setShowModal(true); }}
          style={{
            marginRight: 14, width: 34, height: 34, borderRadius: 17,
            backgroundColor: '#6D28D922', alignItems: 'center', justifyContent: 'center',
          }}>
          <Text style={{fontSize: 22, color: '#A78BFA', lineHeight: 28}}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => { setOtherSearch(''); }, [view]);

  const load = async () => {
    try {
      const r = await getReminders(view);
      setReminders(r.data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, [view]));
  useEffect(() => { load(); }, [reminderSignal]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAction = async (id, status) => {
    try { await setReminderStatus(id, status); load(); }
    catch { Alert.alert('Error', 'Could not update'); }
  };

  const handleReject = async (id, _reason) => {
    try { await setReminderStatus(id, 'rejected'); load(); }
    catch { Alert.alert('Error', 'Could not reject'); }
  };

  const handleReassign = async (id, newUserId) => {
    try { await updateReminder(id, {for_user_id: newUserId, status: 'pending'}); load(); }
    catch { Alert.alert('Error', 'Could not reassign'); }
  };

  const openDetail = r => { setSelectedRem(r); setShowDetailModal(true); };
  const openEdit   = r => { setEditRem(r); setShowModal(true); };

  const VIEWS = [
    ['mine',   '🙋 Mine'],
    ['others', '👥 Others'],
    ['review', '🔍 Review'],
    ['all',    '🌐 All'],
  ];

  // Derived lists
  const pending  = reminders.filter(r => r.status === 'pending');
  const inReview = reminders.filter(r => r.status === 'review');
  const done     = reminders.filter(r => r.status === 'approved' || r.status === 'rejected');

  const reviewCount = reminders.filter(
    r => r.status === 'review' &&
      (r.created_by === currentUser?.id ||
        currentUser?.is_super_admin ||
        ['Manager', 'General'].some(k => (currentUser?.role || '').includes(k))),
  ).length;

  return (
    <Screen>
      {/* View chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: 12, paddingVertical: 10, gap: 7}}>
        {VIEWS.map(([v, l]) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            activeOpacity={0.85}
            style={{
              paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
              borderColor: v === 'review' && reviewCount > 0 ? '#F59E0B44' : view === v ? '#8B5CF644' : C.border,
              backgroundColor: view === v ? '#8B5CF622' : C.card,
            }}>
            <Text style={{fontSize: 12, fontWeight: '700', color: view === v ? '#A78BFA' : C.text3}}>
              {l}{v === 'review' && reviewCount > 0 ? ` (${reviewCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}>

        {/* ── Mine tab ── */}
        {view === 'mine' && (
          <>
            {pending.length === 0 && (
              <View style={{alignItems: 'center', paddingTop: 60}}>
                <Text style={{fontSize: 32}}>🔔</Text>
                <Text style={[T.sm, {marginTop: 8}]}>No pending reminders</Text>
              </View>
            )}
            {pending.length > 0 && (
              <>
                <SectionLabel text="Pending" count={pending.length} />
                {pending.map(r => <RCard key={r.id} r={r} currentUser={currentUser} users={users} onPress={openDetail} onAction={handleAction} />)}
              </>
            )}
          </>
        )}

        {/* ── Others tab ── */}
        {view === 'others' && (
          <GroupedUserView
            reminders={reminders}
            users={users}
            currentUser={currentUser}
            otherSearch={otherSearch}
            setOtherSearch={setOtherSearch}
            expandedUsers={expandedUsers}
            setExpandedUsers={setExpandedUsers}
            onOpenDetail={openDetail}
          />
        )}

        {/* ── Review tab ── */}
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
                  <ReviewCard
                    key={r.id}
                    r={r}
                    currentUser={currentUser}
                    users={users}
                    onPress={openDetail}
                    onApprove={handleAction}
                    onReject={handleReject}
                    onReassign={handleReassign}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* ── All tab ── */}
        {view === 'all' && (
          <GroupedUserView
            reminders={reminders}
            users={users}
            currentUser={currentUser}
            otherSearch={otherSearch}
            setOtherSearch={setOtherSearch}
            expandedUsers={expandedUsers}
            setExpandedUsers={setExpandedUsers}
            onOpenDetail={openDetail}
          />
        )}

        <View style={{height: 30}} />
      </ScrollView>

      <ReminderDetailModal
        visible={showDetailModal}
        r={selectedRem}
        users={users}
        currentUser={currentUser}
        onClose={() => setShowDetailModal(false)}
        onEdit={openEdit}
        onAction={handleAction}
      />

      <ReminderModal
        visible={showModal}
        reminder={editRem}
        users={users}
        currentUser={currentUser}
        onClose={() => setShowModal(false)}
        onSave={() => { setShowModal(false); load(); }}
      />
    </Screen>
  );
}
