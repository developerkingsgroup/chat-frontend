// src/screens/ChatScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Pressable,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { useApp } from '../context/AppContext';
import { getMessages, sendMessage, uploadFile, logCall, searchMessages, editMessage, deleteMessage } from '../utils/api';
import { C, T, Avatar, Screen } from '../components/UI';
import moment from 'moment';

const audioPlayer = new AudioRecorderPlayer();

// ── Message Bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, currentUserId, accent, onLongPress }) {
  const own = msg.sender_id === currentUserId;
  const ac  = accent || C.blue;
  const [playing, setPlaying] = useState(false);

  const toggleVoice = async () => {
    if (playing) {
      await audioPlayer.stopPlayer();
      audioPlayer.removePlayBackListener();
      setPlaying(false);
    } else {
      setPlaying(true);
      await audioPlayer.startPlayer(msg.file_url);
      audioPlayer.addPlayBackListener((e) => {
        if (e.currentPosition >= e.duration) {
          audioPlayer.stopPlayer();
          audioPlayer.removePlayBackListener();
          setPlaying(false);
        }
      });
    }
  };

  return (
    <View style={{ flexDirection:own?'row-reverse':'row', alignItems:'flex-end', marginVertical:3, marginHorizontal:12, gap:6 }}>
      {!own && <Avatar emoji={msg.sender_avatar||'👤'} color={ac} size={28} style={{ borderRadius:8 }}/>}
      <View style={{ maxWidth:'73%' }}>
        {!own && <Text style={{ fontSize:11, color:ac, fontWeight:'600', marginBottom:3, paddingLeft:2 }}>{msg.sender_name}</Text>}
        <Pressable onLongPress={onLongPress} delayLongPress={400} style={{
          backgroundColor: own ? C.blue2 : C.card,
          borderRadius:14,
          borderBottomRightRadius: own?3:14,
          borderBottomLeftRadius:  own?14:3,
          padding: msg.type==='text' ? 11 : 9,
          borderWidth: own?0:1, borderColor:C.border2,
        }}>
          {/* Text */}
          {msg.type==='text' && (
            <View>
              <Text style={{ color:msg.is_deleted?(own?'rgba(255,255,255,.45)':C.text4):(own?'#fff':C.text2), fontSize:14, lineHeight:21, fontStyle:msg.is_deleted?'italic':'normal' }}>
                {msg.content}
              </Text>
              {msg.is_edited && !msg.is_deleted && <Text style={{ fontSize:10, color:own?'rgba(255,255,255,.4)':C.text4, marginTop:1 }}>(edited)</Text>}
            </View>
          )}

          {/* Voice */}
          {msg.type==='voice' && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, minWidth:160 }}>
              <TouchableOpacity onPress={toggleVoice}
                style={{ width:36, height:36, borderRadius:18, backgroundColor:own?'rgba(255,255,255,.18)':ac+'33', alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:15, color:own?'#fff':ac }}>{playing?'⏸':'▶'}</Text>
              </TouchableOpacity>
              <View style={{ flex:1, height:3, backgroundColor:own?'rgba(255,255,255,.3)':C.border2, borderRadius:2 }}/>
              <Text style={{ fontSize:11, color:own?'rgba(255,255,255,.55)':C.text4 }}>
                {msg.duration ? `${Math.floor(msg.duration/60)}:${String(msg.duration%60).padStart(2,'0')}` : '0:00'}
              </Text>
            </View>
          )}

          {/* Image */}
          {msg.type==='image' && (
            <View style={{ width:200, height:150, backgroundColor:C.border, borderRadius:10, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:32 }}>🖼️</Text>
              <Text style={[{color:C.text3, fontSize:11, marginTop:4}]} numberOfLines={1}>{msg.file_name}</Text>
            </View>
          )}

          {/* Video */}
          {msg.type==='video' && (
            <View style={{ width:200, height:150, backgroundColor:C.border, borderRadius:10, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:32 }}>📹</Text>
              <Text style={[{color:C.text3, fontSize:11, marginTop:4}]} numberOfLines={1}>{msg.file_name}</Text>
            </View>
          )}

          {/* File */}
          {msg.type==='file' && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, minWidth:170 }}>
              <Text style={{ fontSize:28 }}>📄</Text>
              <View style={{ flex:1, minWidth:0 }}>
                <Text style={{ color:own?'#fff':C.text2, fontSize:13, fontWeight:'600' }} numberOfLines={1}>{msg.file_name}</Text>
                <Text style={{ color:own?'rgba(255,255,255,.55)':C.text4, fontSize:11, marginTop:2 }}>{msg.file_size}</Text>
              </View>
              <Text style={{ fontSize:18, color:own?'rgba(255,255,255,.6)':C.text4 }}>⬇</Text>
            </View>
          )}

          <Text style={{ fontSize:10, color:own?'rgba(255,255,255,.45)':C.text4, textAlign:'right', marginTop:5 }}>
            {moment(msg.created_at).format('h:mm A')}{own ? (msg.is_read ? ' ✓✓' : ' ✓') : ''}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ChatScreen({ route, navigation }) {
  const { chatType, chatId, title, subtitle, avatar, color } = route.params;
  const { currentUser, messages:allMsgs, loadMessages, pushMessage, clearUnread, sendWsFrame, typingMap, users, chatGroups, isAdmin } = useApp();

  const [input,       setInput]       = useState('');
  const [recording,   setRecording]   = useState(false);
  const [recSecs,     setRecSecs]     = useState(0);
  const [showAtt,     setShowAtt]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [searchMode,  setSearchMode]  = useState(false);
  const [searchQ,     setSearchQ]     = useState('');
  const [searchRes,   setSearchRes]   = useState([]);
  const [editingId,   setEditingId]   = useState(null);

  const flatRef     = useRef(null);
  const recTimer    = useRef(null);
  const typingTimer = useRef(null);
  const ac          = color || C.blue;

  const chatKey = key;
  const typingUsers = typingMap[chatKey] || new Set();

  // Scope-based permission check
  const groupInfo = chatType === 'group' ? chatGroups.find(g => g.id === chatId) : null;
  const managersOnly = groupInfo?.send_permission === 'managers_only';
  const userRole = currentUser?.role?.toLowerCase();
  const canSend = !managersOnly || isAdmin || userRole === 'manager' || userRole === 'admin';
  const typingNames = [...typingUsers]
    .map(uid => users.find(u => u.id === uid)?.name || 'Someone')
    .join(', ');

  const key  = chatType==='group' ? `group_${chatId}` : `direct_${[chatId, currentUser?.id].sort().join('_')}`;
  const msgs = allMsgs[key] || [];

  const runSearch = async (q) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchRes([]); return; }
    try {
      const r = await searchMessages(q, chatType, chatId);
      setSearchRes(r.data);
    } catch {}
  };

  useEffect(() => {
    navigation.setOptions({
      title,
      headerRight: () => (
        <View style={{ flexDirection:'row', gap:8, marginRight:10 }}>
          <TouchableOpacity onPress={()=>setSearchMode(m=>!m)}
            style={{ backgroundColor:searchMode?C.blue2:C.card, padding:8, borderRadius:9, borderWidth:1, borderColor:C.border2 }}>
            <Text style={{fontSize:16}}>🔍</Text>
          </TouchableOpacity>
          {chatType==='direct' && <>
            <TouchableOpacity onPress={()=>navigation.navigate('Call',{userId:chatId,userName:title,userAvatar:avatar,userColor:color,callType:'voice'})}
              style={{ backgroundColor:'#14532D', padding:8, borderRadius:9 }}><Text style={{fontSize:16}}>📞</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>navigation.navigate('Call',{userId:chatId,userName:title,userAvatar:avatar,userColor:color,callType:'video'})}
              style={{ backgroundColor:'#1E3A5F', padding:8, borderRadius:9 }}><Text style={{fontSize:16}}>📹</Text></TouchableOpacity>
          </>}
        </View>
      ),
    });
    fetchMessages();
    return () => clearInterval(recTimer.current);
  }, [chatId]);

  const fetchMessages = async () => {
    try {
      const r = await getMessages(chatType, chatId, { limit:50 });
      loadMessages(chatType, chatId, r.data);
      clearUnread(chatType, chatId);
    } catch { Alert.alert('Error','Could not load messages'); }
    finally { setLoading(false); }
  };

  const send = async () => {
    if (!input.trim()) return;
    const text = input.trim(); setInput('');
    try {
      if (editingId) {
        await editMessage(editingId, text);
        setEditingId(null);
      } else {
        const r = await sendMessage({ chat_id:chatId, chat_type:chatType, type:'text', content:text });
        pushMessage(chatType, chatId, r.data);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not send message');
    }
  };

  const onLongPressBubble = (msg) => {
    if (msg.sender_id !== currentUser?.id) return;
    Alert.alert('Message', msg.content?.slice(0,60), [
      { text: 'Edit', onPress: () => { setInput(msg.content); setEditingId(msg.id); } },
      { text: 'Delete', style:'destructive', onPress: () => deleteMessage(msg.id).catch(()=>{}) },
      { text: 'Cancel', style:'cancel' },
    ]);
  };

  const startRec = async () => {
    setRecording(true); setRecSecs(0);
    await audioPlayer.startRecorder();
    recTimer.current = setInterval(() => setRecSecs(s=>s+1), 1000);
  };

  const stopRec = async () => {
    clearInterval(recTimer.current);
    const uri = await audioPlayer.stopRecorder();
    const dur  = recSecs;
    setRecording(false); setRecSecs(0);
    try {
      const fd = new FormData();
      fd.append('file', { uri, name:'voice.m4a', type:'audio/m4a' });
      const up = await uploadFile(fd);
      const r  = await sendMessage({ chat_id:chatId, chat_type:chatType, type:'voice', file_url:up.data.url, duration:dur });
      pushMessage(chatType, chatId, r.data);
    } catch {}
  };

  const pickImage = async () => {
    setShowAtt(false);
    const res = await launchImageLibrary({ mediaType:'mixed' });
    if (!res.assets?.[0]) return;
    const img = res.assets[0];
    const fd  = new FormData();
    fd.append('file', { uri:img.uri, name:img.fileName||'media', type:img.type||'image/jpeg' });
    const up  = await uploadFile(fd);
    const isVideo = img.type?.startsWith('video/');
    const r   = await sendMessage({ chat_id:chatId, chat_type:chatType, type: isVideo ? 'video' : 'image', file_url:up.data.url, file_name:img.fileName });
    pushMessage(chatType, chatId, r.data);
  };

  const pickDoc = async () => {
    setShowAtt(false);
    try {
      const res = await DocumentPicker.pickSingle({ type:[DocumentPicker.types.allFiles] });
      const fd  = new FormData();
      fd.append('file', { uri:res.uri, name:res.name, type:res.type||'application/octet-stream' });
      const up = await uploadFile(fd);
      const r  = await sendMessage({ chat_id:chatId, chat_type:chatType, type:'file', file_url:up.data.url, file_name:res.name, file_size:up.data.size });
      pushMessage(chatType, chatId, r.data);
    } catch {}
  };

  const fmtSec = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <Screen>
      {chatType==='group' && (
        <View style={{ flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:14, paddingVertical:7, borderBottomWidth:1, borderBottomColor:C.border, flexWrap:'wrap' }}>
          <Text style={{ fontSize:11, color:C.text4 }} onPress={()=>navigation.navigate('Groups')}>Groups</Text>
          <Text style={{ color:C.text4, fontSize:11 }}> › </Text>
          <Text style={{ fontSize:11, color:ac, fontWeight:'600' }}>{subtitle}</Text>
        </View>
      )}

      {searchMode && (
        <View style={{ backgroundColor:C.surface, borderBottomWidth:1, borderBottomColor:C.border }}>
          <TextInput
            style={{ margin:10, padding:10, backgroundColor:C.card, borderRadius:10, color:C.text, borderWidth:1, borderColor:C.border2 }}
            placeholder='Search messages…' placeholderTextColor={C.text4}
            value={searchQ} onChangeText={runSearch} autoFocus
          />
          {searchRes.length > 0 && (
            <FlatList
              data={searchRes}
              keyExtractor={m=>m.id}
              style={{ maxHeight:240 }}
              renderItem={({item}) => (
                <TouchableOpacity style={{ padding:12, borderBottomWidth:1, borderBottomColor:C.border }}
                  onPress={()=>setSearchMode(false)}>
                  <Text style={{ color:C.text3, fontSize:11 }}>{item.sender_name} · {moment(item.created_at).format('MMM D')}</Text>
                  <Text style={{ color:C.text2, fontSize:13, marginTop:2 }} numberOfLines={2}>{item.content}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1 }} keyboardVerticalOffset={90}>
        {loading
          ? <ActivityIndicator color={C.blue} style={{ flex:1 }}/>
          : <FlatList
              ref={flatRef}
              data={msgs}
              keyExtractor={m=>m.id}
              onContentSizeChange={()=>flatRef.current?.scrollToEnd({animated:false})}
              renderItem={({item})=><Bubble msg={item} currentUserId={currentUser?.id} accent={ac} onLongPress={()=>onLongPressBubble(item)}/>}
              contentContainerStyle={{ paddingVertical:10 }}
              ListEmptyComponent={<View style={{alignItems:'center',paddingTop:60}}><Text style={{fontSize:36}}>💬</Text><Text style={[T.sm,{marginTop:8}]}>No messages yet s</Text></View>}
            />
        }

        {/* Attachment tray */}
        {showAtt && !recording && (
          <View style={{ backgroundColor:C.surface, padding:14, flexDirection:'row', gap:10, flexWrap:'wrap', borderTopWidth:1, borderTopColor:C.border }}>
            {[
              { icon:'🖼️', label:'Photo',    action:pickImage },
              { icon:'📁', label:'Document', action:pickDoc },
              { icon:'📍', label:'Location', action:()=>{} },
              { icon:'👤', label:'Contact',  action:()=>{} },
            ].map(a => (
              <TouchableOpacity key={a.label} onPress={a.action} style={{ alignItems:'center', gap:5, width:72 }}>
                <View style={{ width:50, height:50, borderRadius:14, backgroundColor:C.card, borderWidth:1, borderColor:C.border2, alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ fontSize:24 }}>{a.icon}</Text>
                </View>
                <Text style={T.xs}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Edit mode banner */}
        {editingId && (
          <View style={{ paddingHorizontal:16, paddingVertical:6, backgroundColor:C.blue2+'22', borderTopWidth:1, borderTopColor:C.blue2, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <Text style={{ fontSize:12, color:C.blue, fontWeight:'600' }}>✏ Editing message</Text>
            <TouchableOpacity onPress={()=>{setEditingId(null);setInput('');}}>
              <Text style={{ fontSize:12, color:C.text4 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <View style={{ paddingHorizontal:16, paddingVertical:5, backgroundColor:C.surface, borderTopWidth:1, borderTopColor:C.border }}>
            <Text style={{ fontSize:12, color:C.text4, fontStyle:'italic' }}>{typingNames} {typingUsers.size === 1 ? 'is' : 'are'} typing…</Text>
          </View>
        )}

        {/* Input bar */}
        {!canSend ? (
          <View style={{ backgroundColor:C.surface, padding:14, borderTopWidth:1, borderTopColor:C.border, alignItems:'center' }}>
            <Text style={{ color:C.text4, fontSize:13 }}>🔒 Only managers can send messages in this group</Text>
          </View>
        ) : null}
        <View style={{ backgroundColor:C.surface, padding:10, flexDirection:'row', gap:8, alignItems:'center', borderTopWidth:1, borderTopColor:C.border, display: canSend ? 'flex' : 'none' }}>
          {recording ? (
            <>
              <TouchableOpacity onPress={()=>{clearInterval(recTimer.current);setRecording(false);setRecSecs(0);}}
                style={{ width:40,height:40,borderRadius:10,backgroundColor:'#2D1515',alignItems:'center',justifyContent:'center' }}>
                <Text style={{color:C.red,fontSize:16}}>✕</Text>
              </TouchableOpacity>
              <View style={{ flex:1, flexDirection:'row', alignItems:'center', gap:10, backgroundColor:C.card, borderRadius:12, height:44, paddingHorizontal:14, borderWidth:1, borderColor:'#EF444433' }}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor:C.red }}/>
                <Text style={{ color:C.red, fontWeight:'600', fontSize:13 }}>Recording…</Text>
                <Text style={{ color:C.red, marginLeft:'auto', fontFamily:'Courier New' }}>{fmtSec(recSecs)}</Text>
              </View>
              <TouchableOpacity onPress={stopRec} style={{ width:46,height:46,borderRadius:12,backgroundColor:C.red,alignItems:'center',justifyContent:'center' }}>
                <Text style={{fontSize:20}}>⏹</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={()=>setShowAtt(p=>!p)}
                style={{ width:40,height:40,borderRadius:10,backgroundColor:showAtt?C.blue2:C.card,alignItems:'center',justifyContent:'center' }}>
                <Text style={{fontSize:20}}>{showAtt?'✕':'📎'}</Text>
              </TouchableOpacity>
              <TextInput
                style={{ flex:1, backgroundColor:C.card, borderRadius:12, paddingHorizontal:14, paddingVertical:10, color:C.text, fontSize:15, borderWidth:1, borderColor:C.border2 }}
                placeholder={`Message ${title}…`} placeholderTextColor={C.text4}
                value={input}
                onChangeText={(text) => {
                  setInput(text);
                  sendWsFrame({ type:'typing', chatId, chatType, isTyping: true });
                  clearTimeout(typingTimer.current);
                  typingTimer.current = setTimeout(
                    () => sendWsFrame({ type:'typing', chatId, chatType, isTyping: false }),
                    2000
                  );
                }}
                multiline
                onFocus={()=>setShowAtt(false)}
              />
              {input.trim()
                ? <TouchableOpacity onPress={send} style={{ width:44,height:44,borderRadius:12,backgroundColor:C.blue2,alignItems:'center',justifyContent:'center' }}>
                    <Text style={{fontSize:20,color:'#fff'}}>➤</Text>
                  </TouchableOpacity>
                : <TouchableOpacity onLongPress={startRec} style={{ width:44,height:44,borderRadius:12,backgroundColor:C.card,alignItems:'center',justifyContent:'center' }}>
                    <Text style={{fontSize:22}}>🎙️</Text>
                  </TouchableOpacity>
              }
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}