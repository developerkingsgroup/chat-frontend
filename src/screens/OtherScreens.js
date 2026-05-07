// src/screens/OtherScreens.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  RefreshControl, Alert, StatusBar, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getCalls, logCall, getStats } from '../utils/api';
import { C, T, Avatar, Badge, Screen, SectionLabel, Card, PrimaryBtn, Field, Toggle } from '../components/UI';
import moment from 'moment';

// ─────────────────────────────────────────────────────────────────────────────
// Calls Screen
// ─────────────────────────────────────────────────────────────────────────────
export function CallsScreen({ navigation }) {
  const { currentUser } = useApp();
  const [calls,      setCalls]      = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => { try { const r = await getCalls(); setCalls(r.data); } catch {} };
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const fmtDur = (s) => s>0 ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : 'Missed';

  // Group by date
  const grouped = {};
  calls.forEach(c => {
    const d = moment(c.created_at).calendar(null, { sameDay:'[Today]', lastDay:'[Yesterday]', lastWeek:'dddd', sameElse:'MMM D, YYYY' });
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(c);
  });
  const sections = Object.entries(grouped).flatMap(([date, cs]) => [{ type:'header', date }, ...cs.map(c=>({type:'call',...c}))]);

  return (
    <Screen>
      <FlatList
        data={sections}
        keyExtractor={(_,i)=>String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue}/>}
        ListEmptyComponent={<View style={{alignItems:'center',paddingTop:80}}><Text style={{fontSize:40}}>📵</Text><Text style={[T.sm,{marginTop:12}]}>No call history yet</Text></View>}
        renderItem={({ item }) => {
          if (item.type==='header') return <SectionLabel text={item.date}/>;
          const isMe     = item.caller_id===currentUser?.id;
          const isMissed = item.status==='missed';
          const other = isMe
            ? { id:item.callee_id, name:item.callee_name, avatar:item.callee_avatar, color:item.callee_color }
            : { id:item.caller_id, name:item.caller_name, avatar:item.caller_avatar, color:item.caller_color };
          return (
            <View style={{ flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:C.border }}>
              <Avatar emoji={other.avatar||'👤'} color={isMissed?C.red:(other.color||C.blue)} size={44}/>
              <View style={{ flex:1, minWidth:0 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                  <Text style={[T.h3,{color:isMissed?C.red:C.text2}]} numberOfLines={1}>{other.name}</Text>
                  <Text style={{fontSize:13}}>{item.type==='video'?'📹':'📞'}</Text>
                </View>
                <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginTop:2 }}>
                  <Text style={{ fontSize:12, color:isMissed?C.red+'88':isMe?C.blue+'88':C.green+'88' }}>
                    {isMe?'↗ Outgoing':isMissed?'↙ Missed':'↙ Incoming'}
                  </Text>
                  <Text style={T.xs}>· {fmtDur(item.duration)}</Text>
                </View>
              </View>
              <View style={{ flexDirection:'row', gap:6 }}>
                <TouchableOpacity onPress={()=>navigation.navigate('Call',{userId:other.id,userName:other.name,userAvatar:other.avatar,userColor:other.color,callType:'voice'})}
                  style={{width:32,height:32,borderRadius:9,backgroundColor:'#14532D22',alignItems:'center',justifyContent:'center'}}>
                  <Text style={{fontSize:14}}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>navigation.navigate('Call',{userId:other.id,userName:other.name,userAvatar:other.avatar,userColor:other.color,callType:'video'})}
                  style={{width:32,height:32,borderRadius:9,backgroundColor:'#1E3A5F22',alignItems:'center',justifyContent:'center'}}>
                  <Text style={{fontSize:14}}>📹</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Call Screen (Full Screen Modal)
// ─────────────────────────────────────────────────────────────────────────────
export function CallScreen({ route, navigation }) {
  const { userId, userName, userAvatar, userColor, callType } = route.params;
  const [status,  setStatus]  = useState('calling');
  const [secs,    setSecs]    = useState(0);
  const [muted,   setMuted]   = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [video,   setVideo]   = useState(callType==='video');
  const timer = useRef(null);
  const ac = userColor||C.blue;

  useEffect(() => {
    const t = setTimeout(() => {
      setStatus('connected');
      timer.current = setInterval(() => setSecs(s=>s+1), 1000);
    }, 2500);
    return () => { clearTimeout(t); clearInterval(timer.current); };
  }, []);

  const endCall = async () => {
    clearInterval(timer.current);
    setStatus('ended');
    try { await logCall({ callee_id:userId, type:callType, duration:secs, status:'completed' }); } catch {}
    setTimeout(() => navigation.goBack(), 1200);
  };

  const fmtCall = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const CONTROLS = [
    { icon:muted?'🔇':'🎤',    label:muted?'Unmute':'Mute',    on:muted,   action:()=>setMuted(p=>!p) },
    { icon:speaker?'🔊':'🔈',  label:'Speaker',                on:speaker, action:()=>setSpeaker(p=>!p) },
    { icon:video?'📹':'📷',    label:'Camera',                 on:video,   action:()=>setVideo(p=>!p) },
    { icon:'⌨️',               label:'Keypad',                 on:false,   action:()=>{} },
  ];

  return (
    <View style={{ flex:1, backgroundColor:(callType==='video'||video)?'#000':'#050D18', alignItems:'center', justifyContent:'space-between', paddingVertical:60, paddingHorizontal:20 }}>
      <StatusBar barStyle='light-content'/>

      {/* Status */}
      <View style={{ alignItems:'center' }}>
        <Text style={{ fontSize:13, fontWeight:'700', letterSpacing:1, textTransform:'uppercase', color:status==='connected'?C.green:status==='ended'?C.red:C.blue, marginBottom:6 }}>
          {status==='calling'?'Calling…':status==='connected'?fmtCall(secs):'Call Ended'}
        </Text>
        <Text style={T.xs}>{(callType==='video'||video)?'Video':'Voice'} Call</Text>
      </View>

      {/* Avatar */}
      <View style={{ alignItems:'center', justifyContent:'center' }}>
        <View style={{ width:120, height:120, borderRadius:60, backgroundColor:ac+'1E', borderWidth:3, borderColor:ac+'55', alignItems:'center', justifyContent:'center' }}>
          <Text style={{ fontSize:52 }}>{userAvatar||'👤'}</Text>
        </View>
      </View>

      {/* Name */}
      <View style={{ alignItems:'center' }}>
        <Text style={{ fontSize:28, fontWeight:'700', color:C.text }}>{userName}</Text>
      </View>

      {/* Controls */}
      <View style={{ width:'100%', maxWidth:340 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-around', marginBottom:32 }}>
          {CONTROLS.map(ctrl => (
            <TouchableOpacity key={ctrl.label} onPress={ctrl.action} style={{ alignItems:'center', gap:7 }}>
              <View style={{ width:56,height:56,borderRadius:28,backgroundColor:ctrl.on?'#1E3A5F':'#111828',alignItems:'center',justifyContent:'center' }}>
                <Text style={{ fontSize:22 }}>{ctrl.icon}</Text>
              </View>
              <Text style={{ fontSize:10, fontWeight:'600', color:ctrl.on?C.blue:C.text4 }}>{ctrl.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ alignItems:'center' }}>
          <TouchableOpacity onPress={endCall} style={{ alignItems:'center', gap:7 }}>
            <View style={{ width:70,height:70,borderRadius:35,backgroundColor:C.red,alignItems:'center',justifyContent:'center' }}>
              <Text style={{ fontSize:28 }}>📵</Text>
            </View>
            <Text style={{ fontSize:12, fontWeight:'700', color:C.red }}>End Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Screen
// ─────────────────────────────────────────────────────────────────────────────
export function SettingsScreen({ navigation }) {
  const { currentUser, users, companies, isAdmin, signOut, loadAll, token } = useApp();
  const [stats,       setStats]       = useState(null);
  const [showNewCo,   setShowNewCo]   = useState(false);
  const [showNewBr,   setShowNewBr]   = useState(false);
  const [showNewDe,   setShowNewDe]   = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);

  useEffect(() => { if (isAdmin) getStats().then(r=>setStats(r.data)).catch(()=>{}); }, []);

  const reload = () => loadAll(token);

  return (
    <Screen>
      <ScrollView>
        {/* Profile */}
        <Card>
          <Text style={[T.xs,{textTransform:'uppercase',marginBottom:10}]}>Logged In As</Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <Avatar emoji={currentUser?.avatar||'👤'} color={currentUser?.color||C.blue} size={50}/>
            <View style={{ flex:1 }}>
              <Text style={T.h2}>{currentUser?.name}</Text>
              <View style={{ marginTop:4 }}>
                {currentUser?.is_super_admin
                  ? <View style={{backgroundColor:'#1E3A8A',borderRadius:999,paddingHorizontal:8,paddingVertical:2,alignSelf:'flex-start'}}><Text style={{fontSize:10,fontWeight:'700',color:'#60A5FA'}}>👑 Super Admin</Text></View>
                  : <View style={{backgroundColor:(currentUser?.color||C.blue)+'1E',borderRadius:999,paddingHorizontal:8,paddingVertical:2,alignSelf:'flex-start'}}><Text style={{fontSize:10,fontWeight:'600',color:currentUser?.color||C.blue}}>{currentUser?.role||'User'}</Text></View>}
              </View>
            </View>
          </View>
        </Card>

        {/* Admin: Platform Management */}
        {isAdmin && (
          <Card style={{ borderColor:'#2563EB33', backgroundColor:'#1D3A6E0A' }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 }}>
              <Text style={{fontSize:20}}>👑</Text>
              <View>
                <Text style={{fontSize:13,fontWeight:'700',color:'#60A5FA'}}>Platform Management</Text>
                <Text style={T.xs}>Super Admin · Full Control</Text>
              </View>
            </View>
            <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
              {[{icon:'🏢',label:'New Company',nav:'ManageCompany'},{icon:'🌿',label:'New Branch',nav:'ManageBranch'},{icon:'🏷️',label:'New Dept',nav:'ManageDept'}].map(a=>(
                <TouchableOpacity key={a.label} onPress={()=>navigation.navigate(a.nav)} style={{flex:1,minWidth:90,backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:11,padding:10,alignItems:'center',gap:4}}>
                  <Text style={{fontSize:18}}>{a.icon}</Text>
                  <Text style={{fontSize:10,fontWeight:'600',color:C.text3,textAlign:'center'}}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Create user */}
        {isAdmin ? (
          <View style={{ paddingHorizontal:14, marginTop:12 }}>
            <TouchableOpacity onPress={()=>navigation.navigate('ManageUser')} style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:13, borderRadius:12, backgroundColor:C.blue2 }}>
              <Text style={{fontSize:18}}>➕</Text>
              <Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>Create New User</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Card>
            <View style={{ flexDirection:'row', gap:9, alignItems:'center' }}>
              <Text style={{fontSize:16}}>🔒</Text>
              <Text style={T.sm}>Only Super Admin can create or manage users.</Text>
            </View>
          </Card>
        )}

        {/* Users list */}
        <SectionLabel text='Users' count={users.length}/>
        {users.map(u => (
          <TouchableOpacity key={u.id} onPress={()=>isAdmin&&navigation.navigate('ManageUser',{user:u})} activeOpacity={isAdmin?0.78:1}
            style={{ flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:14, paddingVertical:11, borderBottomWidth:1, borderBottomColor:C.border }}>
            <Avatar emoji={u.avatar||'👤'} color={u.color||C.blue} size={44}/>
            <View style={{ flex:1, minWidth:0 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <Text style={T.h3} numberOfLines={1}>{u.name}</Text>
                {!!u.is_super_admin && <Text style={{fontSize:12}}>👑</Text>}
              </View>
              <Text style={[T.sm,{color:u.color||C.text3,marginTop:1}]}>{u.is_super_admin?'Super Admin':(u.role||'User')}</Text>
            </View>
            {isAdmin && <Text style={{color:C.text4,fontSize:14}}>✏️</Text>}
          </TouchableOpacity>
        ))}

        {/* Stats */}
        {stats && (
          <Card style={{ marginTop:16 }}>
            <Text style={[T.h3,{marginBottom:10}]}>Platform Overview</Text>
            {Object.entries(stats).map(([k,v],i) => (
              <View key={k} style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:6, borderTopWidth:1, borderTopColor:C.border }}>
                <Text style={T.sm}>{k.charAt(0).toUpperCase()+k.slice(1)}</Text>
                <Text style={{ fontSize:12, fontWeight:'700', color:C.blue }}>{v}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Sign out */}
        <View style={{ paddingHorizontal:14, marginTop:24, marginBottom:40 }}>
          <TouchableOpacity onPress={()=>Alert.alert('Sign Out','Are you sure?',[{text:'Cancel'},{text:'Sign Out',style:'destructive',onPress:signOut}])}
            style={{ paddingVertical:13, borderRadius:12, backgroundColor:'#2D1515', alignItems:'center' }}>
            <Text style={{ color:C.red, fontWeight:'700', fontSize:14 }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}