// src/screens/RemindersScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Alert, TextInput,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getReminders, createReminder, updateReminder, setReminderStatus, deleteReminder } from '../utils/api';
import { C, T, Avatar, Pill, Screen, SectionLabel, PrimaryBtn, Field, PRIORITY, STATUS, Card } from '../components/UI';
import moment from 'moment';

// ── Reminder Card ─────────────────────────────────────────────────────────────
function RCard({ r, currentUser, users, onEdit, onAction }) {
  const forUser    = users.find(u => u.id === r.for_user_id);
  const fromUser   = users.find(u => u.id === r.created_by);
  const isAssignee = r.for_user_id === currentUser?.id;
  const isFromMe   = r.created_by  === currentUser?.id;
  const pr = PRIORITY[r.priority] || PRIORITY.medium;
  const st = STATUS[r.status]     || STATUS.pending;
  const isDone = r.status==='approved' || r.status==='rejected';

  // Reviewer check
  const iCanReview = r.status==='review' && (
    r.created_by === currentUser?.id ||
    currentUser?.is_super_admin ||
    ['Manager','General'].some(k => (currentUser?.role||'').includes(k))
  );

  return (
    <TouchableOpacity onPress={()=>onEdit(r)} activeOpacity={0.85}
      style={{
        marginHorizontal:8, marginVertical:3, padding:13, borderRadius:12,
        borderWidth:1.5,
        borderColor: r.status==='review'?'#F59E0B44':r.status==='approved'?'#10B98144':r.status==='rejected'?'#EF444444':C.border,
        backgroundColor: r.status==='review'?'#F59E0B06':r.status==='approved'?'#10B98108':r.status==='rejected'?'#EF444408':C.card,
        opacity: isDone?0.75:1,
      }}>

      {/* Title + priority */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
        <Text style={{ fontSize:13, fontWeight:'600', color:isDone?C.text4:C.text, flex:1, textDecorationLine:isDone?'line-through':'none' }} numberOfLines={2}>
          {r.title}
        </Text>
        <View style={{ backgroundColor:pr.bg, borderRadius:999, paddingHorizontal:6, paddingVertical:2 }}>
          <Text style={{ fontSize:11, fontWeight:'700', color:pr.color }}>{pr.icon}</Text>
        </View>
      </View>

      {/* Status badge */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:7 }}>
        <View style={{ backgroundColor:st.bg, borderRadius:999, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:st.color+'33' }}>
          <Text style={{ fontSize:11, fontWeight:'700', color:st.color }}>{st.icon} {st.label}</Text>
        </View>
        {r.status==='review' && <Text style={T.xs}>awaiting approval</Text>}
      </View>

      {/* Assigned user: name + role */}
      {forUser && (
        <View style={{ flexDirection:'row', alignItems:'center', gap:7, marginTop:8 }}>
          <Text style={{ fontSize:14 }}>{forUser.avatar||'👤'}</Text>
          <View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
              <Text style={{ fontSize:12, fontWeight:'700', color:forUser.color||C.blue }}>{forUser.name}</Text>
              {isAssignee && <View style={{ backgroundColor:C.border2, borderRadius:999, paddingHorizontal:5, paddingVertical:1 }}>
                <Text style={{ fontSize:9, color:C.text4 }}>You</Text>
              </View>}
            </View>
            <Text style={{ fontSize:10, color:C.text4, marginTop:1 }}>
              {forUser.is_super_admin?'Super Admin':(forUser.for_role||forUser.role||'User')}
            </Text>
          </View>
        </View>
      )}

      {/* Due date + note */}
      {r.due_date && <Text style={[T.sm, { color:r.status==='pending'?C.blue:C.text4, marginTop:5 }]}>
        ⏰ {moment(r.due_date).format('ddd, MMM D · h:mm A')}
      </Text>}
      {!!r.note && <Text style={[T.sm, { marginTop:3 }]} numberOfLines={1}>📝 {r.note}</Text>}
      {!isFromMe && fromUser && <Text style={[T.xs, { marginTop:4 }]}>From: {fromUser.avatar} {fromUser.creator_name||fromUser.name}</Text>}

      {/* Action: assignee submit */}
      {isAssignee && r.status==='pending' && (
        <TouchableOpacity onPress={()=>onAction(r.id,'review')}
          style={{ marginTop:10, alignSelf:'flex-start', paddingHorizontal:14, paddingVertical:7, borderRadius:9, backgroundColor:'#92400E' }}>
          <Text style={{ color:'#fff', fontSize:12, fontWeight:'700' }}>🔍 Mark Done & Send for Review</Text>
        </TouchableOpacity>
      )}

      {/* Action: reviewer approve/reject */}
      {iCanReview && (
        <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
          <TouchableOpacity onPress={()=>onAction(r.id,'approved')} style={{ flex:1, paddingVertical:8, borderRadius:9, backgroundColor:'#065F46', alignItems:'center' }}>
            <Text style={{ color:'#fff', fontSize:12, fontWeight:'700' }}>✅ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>onAction(r.id,'rejected')} style={{ flex:1, paddingVertical:8, borderRadius:9, backgroundColor:'#7F1D1D', alignItems:'center' }}>
            <Text style={{ color:'#fff', fontSize:12, fontWeight:'700' }}>❌ Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action: resubmit after rejection */}
      {isAssignee && r.status==='rejected' && (
        <TouchableOpacity onPress={()=>onAction(r.id,'pending')}
          style={{ marginTop:9, alignSelf:'flex-start', paddingHorizontal:14, paddingVertical:6, borderRadius:8, backgroundColor:C.border2, borderWidth:1, borderColor:C.text4 }}>
          <Text style={{ color:C.text2, fontSize:11, fontWeight:'600' }}>↩ Revise & Resubmit</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ── Create/Edit Modal ─────────────────────────────────────────────────────────
function ReminderModal({ visible, reminder, users, currentUser, onClose, onSave }) {
  const [title,    setTitle]    = useState('');
  const [note,     setNote]     = useState('');
  const [priority, setPriority] = useState('medium');
  const [forUser,  setForUser]  = useState(currentUser?.id||'');
  const [dueDate,  setDueDate]  = useState(new Date());
  const [showDate, setShowDate] = useState(false);

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title||''); setNote(reminder.note||'');
      setPriority(reminder.priority||'medium'); setForUser(reminder.for_user_id||currentUser?.id||'');
      setDueDate(reminder.due_date ? new Date(reminder.due_date) : new Date());
    } else {
      setTitle(''); setNote(''); setPriority('medium');
      setForUser(currentUser?.id||''); setDueDate(new Date());
    }
  }, [reminder, visible]);

  const save = async () => {
    if (!title.trim()) return Alert.alert('Error','Title required');
    const data = { title:title.trim(), note, priority, for_user_id:forUser, due_date:dueDate.toISOString() };
    try {
      if (reminder) await updateReminder(reminder.id, data);
      else await createReminder(data);
      onSave();
    } catch { Alert.alert('Error','Could not save'); }
  };

  const del = async () => {
    Alert.alert('Delete','Delete this reminder?',[
      { text:'Cancel' },
      { text:'Delete', style:'destructive', onPress: async ()=>{ await deleteReminder(reminder.id); onSave(); } },
    ]);
  };

  // Group users by role
  const roleGroups = {};
  (users||[]).forEach(u => {
    const r = u.is_super_admin ? 'Super Admin' : (u.role||'User');
    if (!roleGroups[r]) roleGroups[r] = [];
    roleGroups[r].push(u);
  });

  return (
    <Modal visible={visible} animationType='slide' presentationStyle='pageSheet'>
      <View style={{ flex:1, backgroundColor:C.bg }}>
        {/* Header */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:C.border }}>
          <Text style={T.h2}>{reminder?'Edit Reminder':'New Reminder'}</Text>
          <View style={{ flexDirection:'row', gap:8 }}>
            {reminder && <TouchableOpacity onPress={del} style={{ backgroundColor:'#2D1515', paddingHorizontal:12, paddingVertical:6, borderRadius:9 }}>
              <Text style={{ color:C.red, fontWeight:'600' }}>Delete</Text>
            </TouchableOpacity>}
            <TouchableOpacity onPress={onClose} style={{ backgroundColor:C.card, width:32,height:32,borderRadius:9,alignItems:'center',justifyContent:'center' }}>
              <Text style={{ color:C.text3, fontSize:16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding:16 }}>
          <Field label='Reminder Title *' placeholder='e.g. Send monthly report' value={title} onChangeText={setTitle}/>
          <Field label='Note (Optional)' placeholder='Add more details…' value={note} onChangeText={setNote} multiline numberOfLines={3} inputStyle={{ height:72 }}/>

          {/* Priority */}
          <Text style={[T.xs,{textTransform:'uppercase',marginBottom:8}]}>Priority</Text>
          <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
            {Object.entries(PRIORITY).map(([k,p]) => (
              <TouchableOpacity key={k} onPress={()=>setPriority(k)} activeOpacity={0.85}
                style={{ flex:1, paddingVertical:10, borderRadius:10, borderWidth:1.5, borderColor:priority===k?p.color+'88':C.border2, backgroundColor:priority===k?p.bg:C.card, alignItems:'center', gap:4 }}>
                <Text style={{ fontSize:16 }}>{p.icon}</Text>
                <Text style={{ fontSize:12, fontWeight:'600', color:priority===k?p.color:C.text3 }}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Due date */}
          <Text style={[T.xs,{textTransform:'uppercase',marginBottom:8}]}>Due Date & Time</Text>
          <TouchableOpacity onPress={()=>setShowDate(true)}
            style={{ backgroundColor:C.card, borderRadius:10, padding:12, borderWidth:1.5, borderColor:C.border2, marginBottom:14 }}>
            <Text style={{ color:C.text, fontSize:14 }}>{moment(dueDate).format('ddd, MMM D YYYY · h:mm A')}</Text>
          </TouchableOpacity>
          <DatePicker modal open={showDate} date={dueDate} theme='dark' onConfirm={d=>{setShowDate(false);setDueDate(d);}} onCancel={()=>setShowDate(false)}/>

          {/* Assign To — role-wise */}
          <Text style={[T.xs,{textTransform:'uppercase',marginBottom:8}]}>Assign To — By Role</Text>
          {Object.entries(roleGroups).map(([role,grpUsers]) => (
            <View key={role} style={{ marginBottom:10 }}>
              <View style={{ backgroundColor:'#8B5CF611', borderRadius:6, paddingHorizontal:8, paddingVertical:3, alignSelf:'flex-start', marginBottom:6 }}>
                <Text style={{ fontSize:10, fontWeight:'700', color:'#A78BFA', textTransform:'uppercase', letterSpacing:0.5 }}>
                  {role==='Super Admin'?'👑 ':''}{role}
                </Text>
              </View>
              {grpUsers.map(u => {
                const sel = forUser===u.id;
                return (
                  <TouchableOpacity key={u.id} onPress={()=>setForUser(u.id)} activeOpacity={0.85}
                    style={{
                      flexDirection:'row', alignItems:'flex-start', gap:10, padding:11,
                      borderRadius:12, marginBottom:4,
                      borderWidth:1.5, borderColor:sel?u.color+'66':C.border,
                      borderLeftWidth:sel?3:1.5, borderLeftColor:sel?(u.color||C.blue):C.border,
                      backgroundColor:sel?C.card:'transparent',
                    }}>
                    <View style={{ width:34,height:34,borderRadius:9,backgroundColor:(u.color||C.blue)+'22',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:(u.color||C.blue)+'44' }}>
                      <Text style={{fontSize:18}}>{u.avatar||'👤'}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
                        <Text style={{ fontSize:13, fontWeight:'700', color:sel?C.text:C.text2 }}>{u.name}</Text>
                        {u.id===currentUser?.id && <View style={{backgroundColor:C.border2,borderRadius:999,paddingHorizontal:5}}><Text style={{fontSize:9,color:C.text4}}>You</Text></View>}
                        {u.is_super_admin && <View style={{backgroundColor:'#1E3A8A',borderRadius:999,paddingHorizontal:5}}><Text style={{fontSize:9,fontWeight:'700',color:'#60A5FA'}}>Admin</Text></View>}
                      </View>
                      <Text style={[T.xs,{color:u.is_super_admin?'#60A5FA':(u.color||C.text3),marginTop:2}]}>
                        {u.is_super_admin?'Super Admin':(u.role||'User')}
                      </Text>
                    </View>
                    <View style={{ width:20,height:20,borderRadius:5,backgroundColor:sel?C.purple:C.card,borderWidth:1.5,borderColor:sel?C.purple:C.border2,alignItems:'center',justifyContent:'center' }}>
                      {sel && <Text style={{fontSize:11,color:'#fff'}}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={{ padding:14, borderTopWidth:1, borderTopColor:C.border }}>
          <PrimaryBtn label={reminder?'Save Changes':'Set Reminder'} onPress={save} disabled={!title.trim()} color='#6D28D9'/>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Reminders Screen ─────────────────────────────────────────────────────
export default function RemindersScreen() {
  const { currentUser, users, reminderSignal } = useApp();
  const [reminders,  setReminders]  = useState([]);
  const [view,       setView]       = useState('mine');
  const [showModal,  setShowModal]  = useState(false);
  const [editRem,    setEditRem]    = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { const r = await getReminders(view); setReminders(r.data); } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, [view]));
  useEffect(() => { load(); }, [reminderSignal]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAction = async (id, status) => {
    try { await setReminderStatus(id, status); load(); }
    catch { Alert.alert('Error','Could not update'); }
  };

  const openEdit = (r) => { setEditRem(r); setShowModal(true); };

  const VIEWS = [['mine','🙋 Mine'],['others','→ Others'],['review','🔍 Review'],['byuser','👥 By User'],['all','All']];

  const pending  = reminders.filter(r => r.status==='pending');
  const inReview = reminders.filter(r => r.status==='review');
  const done     = reminders.filter(r => r.status==='approved'||r.status==='rejected');

  // Group pending + review by user
  const byUser = {};
  [...pending,...inReview].forEach(r => { const k=r.for_user_id; if(!byUser[k])byUser[k]=[]; byUser[k].push(r); });

  const reviewCount = reminders.filter(r => r.status==='review' && (
    r.created_by===currentUser?.id || currentUser?.is_super_admin ||
    ['Manager','General'].some(k=>(currentUser?.role||'').includes(k))
  )).length;

  return (
    <Screen>
      {/* New Reminder button */}
      <View style={{ padding:12 }}>
        <TouchableOpacity onPress={()=>{setEditRem(null);setShowModal(true);}} activeOpacity={0.85}
          style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:13, borderRadius:12, backgroundColor:'#6D28D9' }}>
          <Text style={{fontSize:18}}>🔔</Text>
          <Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>New Reminder</Text>
        </TouchableOpacity>
      </View>

      {/* View chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:12, paddingBottom:8, gap:7 }}>
        {VIEWS.map(([v,l]) => (
          <TouchableOpacity key={v} onPress={()=>setView(v)} activeOpacity={0.85}
            style={{ paddingHorizontal:13, paddingVertical:6, borderRadius:999, borderWidth:1,
              borderColor: v==='review'&&reviewCount>0?'#F59E0B44':(view===v?'#8B5CF644':C.border),
              backgroundColor: view===v?'#8B5CF622':C.card }}>
            <Text style={{ fontSize:12, fontWeight:'700', color:view===v?'#A78BFA':C.text3 }}>
              {l}{v==='review'&&reviewCount>0?` (${reviewCount})`:''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple}/>}>

        {/* By User grouped view */}
        {view==='byuser' ? (
          Object.keys(byUser).length===0
            ? <View style={{alignItems:'center',paddingTop:60}}><Text style={{fontSize:32}}>🔔</Text><Text style={[T.sm,{marginTop:8}]}>No active reminders</Text></View>
            : Object.entries(byUser).map(([uid, rems]) => {
                const u = users.find(x=>x.id===uid);
                const isMe = uid===currentUser?.id;
                return (
                  <View key={uid}>
                    <View style={{ flexDirection:'row', alignItems:'flex-start', gap:9, paddingHorizontal:14, paddingVertical:9 }}>
                      <View style={{ width:36,height:36,borderRadius:9,backgroundColor:(u?.color||C.blue)+'22',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:(u?.color||C.blue)+'33' }}>
                        <Text style={{fontSize:19}}>{u?.avatar||'👤'}</Text>
                      </View>
                      <View style={{ flex:1 }}>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                          <Text style={{ fontSize:13, fontWeight:'700', color:u?.color||C.blue }}>{u?.name||'Unknown'}</Text>
                          {isMe && <View style={{backgroundColor:C.border2,borderRadius:999,paddingHorizontal:5}}><Text style={{fontSize:9,color:C.text4}}>You</Text></View>}
                          {u?.is_super_admin
                            ? <View style={{backgroundColor:'#1E3A8A',borderRadius:999,paddingHorizontal:5}}><Text style={{fontSize:9,fontWeight:'700',color:'#60A5FA'}}>👑 Admin</Text></View>
                            : <View style={{backgroundColor:(u?.color||C.blue)+'1E',borderRadius:999,paddingHorizontal:6}}><Text style={{fontSize:9,fontWeight:'600',color:u?.color||C.blue}}>{u?.role||'User'}</Text></View>}
                          <View style={{marginLeft:'auto',backgroundColor:'#8B5CF622',borderRadius:999,paddingHorizontal:7,paddingVertical:2}}>
                            <Text style={{fontSize:10,fontWeight:'700',color:'#A78BFA'}}>{rems.length}</Text>
                          </View>
                        </View>
                        <Text style={[T.xs,{color:C.text4,marginTop:2}]}>{u?.is_super_admin?'Super Admin':(u?.role||'User')}</Text>
                      </View>
                    </View>
                    {rems.map(r=><RCard key={r.id} r={r} currentUser={currentUser} users={users} onEdit={openEdit} onAction={handleAction}/>)}
                  </View>
                );
              })
        ) : (
          // Flat list views
          <>
            {pending.length===0&&inReview.length===0&&<View style={{alignItems:'center',paddingTop:60}}><Text style={{fontSize:32}}>🔔</Text><Text style={[T.sm,{marginTop:8}]}>No active reminders</Text></View>}
            {pending.length>0 && <><SectionLabel text='Pending' count={pending.length}/>{pending.map(r=><RCard key={r.id} r={r} currentUser={currentUser} users={users} onEdit={openEdit} onAction={handleAction}/>)}</>}
            {inReview.length>0 && <><SectionLabel text='Under Review' count={inReview.length}/>{inReview.map(r=><RCard key={r.id} r={r} currentUser={currentUser} users={users} onEdit={openEdit} onAction={handleAction}/>)}</>}
          </>
        )}

        {done.length>0 && <><SectionLabel text='Completed' count={done.length}/>{done.map(r=><RCard key={r.id} r={r} currentUser={currentUser} users={users} onEdit={openEdit} onAction={handleAction}/>)}</>}
        <View style={{height:30}}/>
      </ScrollView>

      <ReminderModal
        visible={showModal} reminder={editRem} users={users} currentUser={currentUser}
        onClose={()=>setShowModal(false)}
        onSave={()=>{ setShowModal(false); load(); }}
      />
    </Screen>
  );
}