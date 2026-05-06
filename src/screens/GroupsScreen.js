// src/screens/GroupsScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import { C, T, Avatar, Badge, Screen, SectionLabel } from '../components/UI';

export default function GroupsScreen({ navigation }) {
  const { companies, chatGroups } = useApp();
  const [level,         setLevel]         = useState('companies');
  const [activeCompany, setActiveCompany] = useState(null);
  const [activeBranch,  setActiveBranch]  = useState(null);

  // Build hierarchy
  const enriched = companies.map(co => ({
    ...co,
    branches: (co.branches||[]).map(br => ({
      ...br,
      subgroups: chatGroups.filter(g => g.branch_id === br.id),
    })),
  }));

  const selCo = enriched.find(c => c.id === activeCompany?.id);
  const selBr = selCo?.branches?.find(b => b.id === activeBranch?.id);

  const companyUnread = (co) => (co.branches||[]).reduce((a,b) => a + (b.subgroups||[]).reduce((x,g) => x+(g.unread||0), 0), 0);
  const branchUnread  = (br) => (br.subgroups||[]).reduce((a,g) => a+(g.unread||0), 0);

  const openGroup = (g) => navigation.navigate('Chat', {
    chatType:'group', chatId:g.id, title:g.name,
    subtitle:`${g.dept_name} · ${g.branch_name}`,
    avatar:g.dept_icon, color:g.dept_color,
  });

  return (
    <Screen>
      {/* Breadcrumb */}
      {level!=='companies' && (
        <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor:C.border, gap:8 }}>
          <TouchableOpacity onPress={()=>{setLevel('companies');setActiveCompany(null);setActiveBranch(null);}}
            style={{ backgroundColor:C.card, width:34,height:34,borderRadius:9,alignItems:'center',justifyContent:'center' }}>
            <Text style={{fontSize:18,color:C.text2}}>‹</Text>
          </TouchableOpacity>
          <Text style={T.sm} onPress={()=>{setLevel('companies');setActiveCompany(null);}}>Groups</Text>
          {level==='branches' && activeCompany && <>
            <Text style={T.sm}> › </Text>
            <Text style={[T.sm,{color:activeCompany.color,fontWeight:'600'}]}>{activeCompany.name}</Text>
          </>}
          {level==='depts' && activeBranch && <>
            <Text style={T.sm}> › </Text>
            <Text style={[T.sm,{color:selCo?.color,fontWeight:'600'}]} onPress={()=>setLevel('branches')}>{selCo?.name}</Text>
            <Text style={T.sm}> › </Text>
            <Text style={[T.sm,{color:activeBranch.color,fontWeight:'600'}]}>{activeBranch.name}</Text>
          </>}
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom:20 }}>

        {/* ── Level 1: Companies ── */}
        {level==='companies' && <>
          <SectionLabel text='Companies' count={enriched.length}/>
          {enriched.map(co => {
            const unread = companyUnread(co);
            return (
              <TouchableOpacity key={co.id} onPress={()=>{setActiveCompany(co);setLevel('branches');}} activeOpacity={0.82}
                style={{ flexDirection:'row', alignItems:'center', gap:13, marginHorizontal:8, marginVertical:3, padding:14, borderRadius:14, borderWidth:1.5, borderColor:co.color+'33', backgroundColor:co.color+'0A' }}>
                <View style={{ width:56, height:56, borderRadius:15, backgroundColor:co.color+'22', borderWidth:2, borderColor:co.color+'44', alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ fontSize:28 }}>{co.avatar}</Text>
                </View>
                <View style={{ flex:1, minWidth:0 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                    <Text style={[T.h2,{flex:1}]} numberOfLines={1}>{co.name}</Text>
                    {unread>0 && <Badge count={unread}/>}
                  </View>
                  <Text style={{ color:co.color, fontSize:12, fontWeight:'500', marginTop:2 }}>{co.tagline}</Text>
                  <View style={{ flexDirection:'row', gap:4, marginTop:6 }}>
                    {(co.branches||[]).map(b => <View key={b.id} style={{ width:7, height:7, borderRadius:4, backgroundColor:b.color||co.color }}/>)}
                  </View>
                </View>
                <Text style={{ fontSize:22, color:co.color+'88' }}>›</Text>
              </TouchableOpacity>
            );
          })}
        </>}

        {/* ── Level 2: Branches ── */}
        {level==='branches' && selCo && <>
          <SectionLabel text='Branches' count={selCo.branches?.length||0}/>
          {selCo.branches?.map(br => {
            const unread = branchUnread(br);
            return (
              <TouchableOpacity key={br.id} onPress={()=>{setActiveBranch(br);setLevel('depts');}} activeOpacity={0.78}
                style={{ flexDirection:'row', alignItems:'center', gap:12, marginHorizontal:8, marginVertical:2, padding:13, borderRadius:12, borderWidth:1, borderColor:C.border, backgroundColor:C.card }}>
                <Avatar emoji={br.avatar} color={br.color} size={46}/>
                <View style={{ flex:1 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                    <Text style={T.h3}>{br.name}</Text>
                    {unread>0 && <Badge count={unread}/>}
                  </View>
                  <Text style={[T.sm,{color:br.color||C.text3,marginTop:1}]}>{br.city}</Text>
                </View>
                <Text style={{ fontSize:20, color:(br.color||C.text3)+'88' }}>›</Text>
              </TouchableOpacity>
            );
          })}
        </>}

        {/* ── Level 3: Dept groups ── */}
        {level==='depts' && selBr && <>
          <SectionLabel text='Departments' count={selBr.subgroups?.length||0}/>
          {selBr.subgroups?.map(g => (
            <TouchableOpacity key={g.id} onPress={()=>openGroup(g)} activeOpacity={0.78}
              style={{ flexDirection:'row', alignItems:'center', gap:10, marginHorizontal:8, marginVertical:2, padding:12, borderRadius:12, borderWidth:1, borderColor:C.border, backgroundColor:C.card }}>
              <View style={{ width:3, height:42, borderRadius:2, backgroundColor:g.dept_color, opacity:0.7 }}/>
              <View style={{ width:42, height:42, borderRadius:11, backgroundColor:'#0D1420', borderWidth:1.5, borderColor:C.border2, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:19 }}>{g.dept_icon}</Text>
              </View>
              <View style={{ flex:1, minWidth:0 }}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                  <Text style={T.h3} numberOfLines={1}>{g.name}</Text>
                  <Badge count={g.unread}/>
                </View>
                <Text style={[T.sm,{marginTop:2}]} numberOfLines={1}>
                  {g.last_message?.content || 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>}

      </ScrollView>
    </Screen>
  );
}