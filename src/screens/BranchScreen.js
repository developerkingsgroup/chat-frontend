// src/screens/BranchScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useApp } from '../context/AppContext';
import { C, T, Avatar, Badge, Screen, SectionLabel } from '../components/UI';

export function BranchScreen({ navigation }) {
  const { companies, chatGroups } = useApp();
  const [activeBranch, setActiveBranch] = useState(null);
  const [filterDept,   setFilterDept]   = useState(null);

  const allBranches = companies.flatMap(co =>
    (co.branches||[]).map(br => ({ ...br, companyName:co.name, companyAvatar:co.avatar, companyColor:co.color }))
  );

  // Dept filter options (from all chat groups)
  const depts = [...new Map(chatGroups.map(g => [g.department_id, { id:g.department_id, name:g.dept_name, icon:g.dept_icon, color:g.dept_color, short:g.short_name }])).values()];

  if (activeBranch) {
    const subgroups = chatGroups.filter(g => g.branch_id===activeBranch.id && (!filterDept || g.department_id===filterDept));
    return (
      <Screen>
        {/* Header */}
        <View style={{ flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor:C.border }}>
          <TouchableOpacity onPress={()=>{setActiveBranch(null);setFilterDept(null);}} style={{ backgroundColor:C.card,width:34,height:34,borderRadius:9,alignItems:'center',justifyContent:'center' }}>
            <Text style={{fontSize:18,color:C.text2}}>‹</Text>
          </TouchableOpacity>
          <Avatar emoji={activeBranch.avatar} color={activeBranch.color} size={36}/>
          <View style={{ flex:1 }}>
            <Text style={T.h3}>{activeBranch.name}</Text>
            <Text style={[T.sm,{color:activeBranch.color,marginTop:1}]}>{activeBranch.city}</Text>
          </View>
        </View>
        {/* Dept chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:12, paddingVertical:10, gap:7 }}>
          <TouchableOpacity onPress={()=>setFilterDept(null)} style={{ paddingHorizontal:12,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:!filterDept?'#2563EB33':C.border,backgroundColor:!filterDept?'#1E3A8A':C.card }}>
            <Text style={{ fontSize:11,fontWeight:'700',color:!filterDept?'#93C5FD':C.text3 }}>All</Text>
          </TouchableOpacity>
          {depts.map(d => (
            <TouchableOpacity key={d.id} onPress={()=>setFilterDept(filterDept===d.id?null:d.id)} style={{ paddingHorizontal:12,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:filterDept===d.id?d.color+'44':C.border,backgroundColor:filterDept===d.id?d.color+'28':C.card }}>
              <Text style={{ fontSize:11,fontWeight:'700',color:filterDept===d.id?d.color:C.text3 }}>{d.icon} {d.short||d.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <FlatList
          data={subgroups}
          keyExtractor={g=>g.id}
          renderItem={({ item:g }) => (
            <TouchableOpacity onPress={()=>navigation.navigate('Chat',{chatType:'group',chatId:g.id,title:g.name,subtitle:`${g.dept_name} · ${g.branch_name}`,avatar:g.dept_icon,color:g.dept_color})} activeOpacity={0.78}
              style={{ flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,paddingVertical:11,marginHorizontal:8,marginVertical:2,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.card }}>
              <View style={{ width:3,height:40,borderRadius:2,backgroundColor:g.dept_color,opacity:0.7 }}/>
              <View style={{ width:42,height:42,borderRadius:11,backgroundColor:'#0D1420',borderWidth:1.5,borderColor:C.border2,alignItems:'center',justifyContent:'center' }}>
                <Text style={{fontSize:19}}>{g.dept_icon}</Text>
              </View>
              <View style={{ flex:1,minWidth:0 }}>
                <View style={{ flexDirection:'row',alignItems:'center',justifyContent:'space-between' }}>
                  <Text style={T.h3} numberOfLines={1}>{g.name}</Text>
                  <Badge count={g.unread}/>
                </View>
                <Text style={[T.sm,{marginTop:2}]} numberOfLines={1}>{g.last_message?.content||'No messages yet'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </Screen>
    );
  }

  // Branch list grouped by company
  const grouped = {};
  allBranches.forEach(b => { if (!grouped[b.companyName]) grouped[b.companyName]=[]; grouped[b.companyName].push(b); });

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom:20 }}>
        {Object.entries(grouped).map(([coName, branches]) => {
          const co = companies.find(c=>c.name===coName);
          return (
            <View key={coName}>
              <View style={{ flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:14,paddingTop:14,paddingBottom:5 }}>
                <Text style={{fontSize:15}}>{co?.avatar}</Text>
                <Text style={{ fontSize:10,fontWeight:'700',color:co?.color,textTransform:'uppercase',letterSpacing:0.6 }}>{coName}</Text>
                <View style={{ flex:1,height:1,backgroundColor:(co?.color||C.border)+'33' }}/>
              </View>
              {branches.map(br => {
                const unread = chatGroups.filter(g=>g.branch_id===br.id).reduce((a,g)=>a+(g.unread||0),0);
                return (
                  <TouchableOpacity key={br.id} onPress={()=>setActiveBranch(br)} activeOpacity={0.78}
                    style={{ flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14,paddingVertical:12,marginHorizontal:8,marginVertical:2,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.card }}>
                    <Avatar emoji={br.avatar} color={br.color} size={44}/>
                    <View style={{ flex:1 }}>
                      <View style={{ flexDirection:'row',alignItems:'center',gap:6 }}>
                        <Text style={T.h3}>{br.name}</Text>
                        {unread>0&&<Badge count={unread}/>}
                      </View>
                      <Text style={[T.sm,{color:br.color||C.text3,marginTop:1}]}>{br.city}</Text>
                    </View>
                    <Text style={{ fontSize:18,color:(br.color||C.text3)+'88' }}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Departments Screen
// ─────────────────────────────────────────────────────────────────────────────
export function DepartmentsScreen({ navigation }) {
  const { departments, chatGroups, companies } = useApp();
  const [filterDept, setFilterDept] = useState(null);

  const filtered = filterDept ? chatGroups.filter(g=>g.department_id===filterDept) : [];

  return (
    <Screen>
      {/* Dept filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:12, paddingVertical:10, gap:7 }}>
        <TouchableOpacity onPress={()=>setFilterDept(null)} style={{ paddingHorizontal:12,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:!filterDept?'#2563EB33':C.border,backgroundColor:!filterDept?'#1E3A8A':C.card }}>
          <Text style={{ fontSize:11,fontWeight:'700',color:!filterDept?'#93C5FD':C.text3 }}>All</Text>
        </TouchableOpacity>
        {departments.map(d => (
          <TouchableOpacity key={d.id} onPress={()=>setFilterDept(filterDept===d.id?null:d.id)} style={{ paddingHorizontal:12,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:filterDept===d.id?d.color+'44':C.border,backgroundColor:filterDept===d.id?d.color+'28':C.card }}>
            <Text style={{ fontSize:11,fontWeight:'700',color:filterDept===d.id?d.color:C.text3 }}>{d.icon} {d.short_name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingBottom:20 }}>
        {!filterDept ? (
          // All departments
          <>
            <SectionLabel text='Departments' count={departments.length}/>
            {departments.map(d => {
              const unread = chatGroups.filter(g=>g.department_id===d.id).reduce((a,g)=>a+(g.unread||0),0);
              return (
                <TouchableOpacity key={d.id} onPress={()=>setFilterDept(d.id)} activeOpacity={0.78}
                  style={{ flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:C.border }}>
                  <View style={{ width:46,height:46,borderRadius:12,backgroundColor:d.color+'1E',borderWidth:1.5,borderColor:d.color+'33',alignItems:'center',justifyContent:'center' }}>
                    <Text style={{fontSize:22}}>{d.icon}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={T.h3}>{d.name}</Text>
                    <Text style={[T.sm,{marginTop:1}]}>{companies.reduce((a,c)=>a+(c.branches?.length||0),0)} branch groups</Text>
                  </View>
                  {unread>0&&<View style={{backgroundColor:d.color,minWidth:20,height:20,borderRadius:10,alignItems:'center',justifyContent:'center',paddingHorizontal:5}}><Text style={{color:'#fff',fontSize:10,fontWeight:'700'}}>{unread}</Text></View>}
                  <Text style={{fontSize:16,color:C.text4}}>›</Text>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          // Filtered groups grouped by company
          <>
            <SectionLabel text={`${departments.find(d=>d.id===filterDept)?.name} · All Branches`} count={filtered.length}/>
            {companies.map(co => {
              const coFiltered = filtered.filter(g=>g.company_id===co.id);
              if (!coFiltered.length) return null;
              return (
                <View key={co.id}>
                  <View style={{ flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:14,paddingTop:10,paddingBottom:4 }}>
                    <Text style={{fontSize:14}}>{co.avatar}</Text>
                    <Text style={{ fontSize:10,fontWeight:'700',color:co.color,textTransform:'uppercase',letterSpacing:0.5 }}>{co.name}</Text>
                    <View style={{ flex:1,height:1,backgroundColor:co.color+'22' }}/>
                  </View>
                  {coFiltered.map(g => (
                    <TouchableOpacity key={g.id} onPress={()=>navigation.navigate('Chat',{chatType:'group',chatId:g.id,title:g.name,subtitle:`${g.dept_name} · ${g.branch_name}`,avatar:g.dept_icon,color:g.dept_color})} activeOpacity={0.78}
                      style={{ flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,paddingVertical:10,marginHorizontal:8,marginVertical:2,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.card }}>
                      <View style={{ width:3,height:40,borderRadius:2,backgroundColor:g.dept_color,opacity:0.7 }}/>
                      <View style={{ width:40,height:40,borderRadius:10,backgroundColor:'#0E1525',borderWidth:1.5,borderColor:C.border2,alignItems:'center',justifyContent:'center' }}>
                        <Text style={{fontSize:18}}>{g.dept_icon}</Text>
                      </View>
                      <View style={{ flex:1,minWidth:0 }}>
                        <Text style={T.h3} numberOfLines={1}>{g.name}</Text>
                        <Text style={[T.sm,{marginTop:1}]}>{g.branch_name} · {g.city}</Text>
                      </View>
                      <Badge count={g.unread}/>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}