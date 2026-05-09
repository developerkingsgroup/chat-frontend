// src/screens/ChatListScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getConversations } from '../utils/api';
import { C, T, Avatar, Badge, Screen, SectionLabel, Empty } from '../components/UI';
import moment from 'moment';

function ConvoRow({ item, onPress, isOnline }) {
  const { user, last_message, unread } = item;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78}
      style={{ flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:C.border }}>
      <View style={{ position:'relative' }}>
        <Avatar emoji={user.avatar||'👤'} color={user.color||C.blue} size={46}/>
        {isOnline && <View style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:5, backgroundColor:C.green, borderWidth:2, borderColor:C.bg }}/>}
      </View>
      <View style={{ flex:1, minWidth:0 }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:6 }}>
          <Text style={[T.h3, { flex:1 }]} numberOfLines={1}>{user.name}</Text>
          <Text style={T.xs}>{last_message ? moment(last_message.created_at).fromNow(true) : ''}</Text>
        </View>
        <Text style={[T.sm, { color:user.color||C.text3, marginTop:1 }]} numberOfLines={1}>
          {user.is_super_admin ? '👑 Super Admin' : user.role||'User'}
        </Text>
        <Text style={[T.sm, { marginTop:2, color:C.text4 }]} numberOfLines={1}>
          {last_message?.content || 'Tap to start chatting'}
        </Text>
      </View>
      <Badge count={unread}/>
    </TouchableOpacity>
  );
}

export default function ChatListScreen({ navigation }) {
  const { conversations, setConversations, users, currentUser, onlineUsers } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { const r = await getConversations(); setConversations(r.data); } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const others = users.filter(u => u.id !== currentUser?.id && !conversations.find(c => c.user?.id === u.id));

  const openChat = (u) => navigation.navigate('Chat', {
    chatType:'direct', chatId:u.id, title:u.name,
    subtitle: u.is_super_admin?'Super Admin':(u.role||'User'),
    avatar:u.avatar, color:u.color||C.blue,
  });

  return (
    <Screen>
      <FlatList
        data={conversations}
        keyExtractor={i => i.user?.id}
        ListEmptyComponent={<Empty icon='💬' text='No conversations yet'/>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue}/>}
        renderItem={({ item }) => (
          <ConvoRow item={item} onPress={() => openChat(item.user)} isOnline={onlineUsers.has(item.user?.id)}/>
        )}
        ListFooterComponent={() => others.length>0 ? (
          <View>
            <SectionLabel text='Other Users' count={others.length}/>
            {others.map(u => (
              <TouchableOpacity key={u.id} onPress={() => openChat(u)} activeOpacity={0.78}
                style={{ flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:14, paddingVertical:11, borderBottomWidth:1, borderBottomColor:C.border }}>
                <View style={{ position:'relative' }}>
                  <Avatar emoji={u.avatar||'👤'} color={u.color||C.blue} size={44}/>
                  {onlineUsers.has(u.id) && <View style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:5, backgroundColor:C.green, borderWidth:2, borderColor:C.bg }}/>}
                </View>
                <View style={{ flex:1 }}>
                  <Text style={T.h3}>{u.name}</Text>
                  <Text style={[T.sm, { color:u.color||C.text3, marginTop:1 }]}>{u.role||'User'}</Text>
                </View>
                <Text style={{ color:C.text4, fontSize:18 }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      />
    </Screen>
  );
}