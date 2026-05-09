// App.js — TravKings & Partners React Native App
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AppProvider, useApp } from './src/context/AppContext';
import { C, T, Badge } from './src/components/UI';

import AuthScreen                     from './src/screens/AuthScreen';
import ChatListScreen                  from './src/screens/ChatListScreen';
import ChatScreen                      from './src/screens/ChatScreen';
import GroupsScreen                    from './src/screens/GroupsScreen';
import RemindersScreen                 from './src/screens/RemindersScreen';
import { CallsScreen, CallScreen } from './src/screens/OtherScreens';
import { ManageUserScreen, ManageCompanyScreen, ManageBranchScreen, ManageDeptScreen } from './src/screens/ManageScreens';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Screen header style ────────────────────────────────────────────────────────
const headerStyle = {
  backgroundColor: C.surface,
  borderBottomColor: C.border,
  borderBottomWidth: 1,
  elevation: 0,
  shadowOpacity: 0,
};
const headerTitleStyle = { color: C.text, fontSize: 16, fontWeight: '700' };

// ── Branch & Departments Screens (lazy loaded) ────────────────────────────────
function BranchScreen({ navigation }) {
  const { companies, chatGroups } = useApp();
  const [activeBranch, setActiveBranch] = React.useState(null);
  const { View: V, Text: Tx, ScrollView: SV, TouchableOpacity: TO, FlatList: FL } = require('react-native');
  const { Screen, SectionLabel, C: col, T: t } = require('./src/components/UI');

  const allBranches = companies.flatMap(co => (co.branches || []).map(br => ({ ...br, companyName: co.name, companyAvatar: co.avatar, companyColor: co.color })));

  if (activeBranch) {
    const subgroups = chatGroups.filter(g => g.branch_id === activeBranch.id);
    return (
      <Screen>
        <V style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: col.border }}>
          <TO onPress={() => setActiveBranch(null)} style={{ backgroundColor: col.card, width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}><Tx style={{ fontSize: 18 }}>‹</Tx></TO>
          <V style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: activeBranch.color + '22', alignItems: 'center', justifyContent: 'center' }}><Tx style={{ fontSize: 18 }}>{activeBranch.avatar}</Tx></V>
          <V style={{ flex: 1 }}><Tx style={t.h3}>{activeBranch.name}</Tx><Tx style={[t.xs, { color: activeBranch.color }]}>{activeBranch.city}</Tx></V>
        </V>
        <FL data={subgroups} keyExtractor={i => i.id} contentContainerStyle={{ paddingVertical: 6 }}
          renderItem={({ item }) => (
            <TO onPress={() => navigation.navigate('Chat', { chatType: 'group', chatId: item.id, title: item.name, subtitle: `${item.dept_name} · ${item.branch_name}`, avatar: item.dept_icon, color: item.dept_color })} activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: col.border, backgroundColor: col.card, marginVertical: 2 }}>
              <V style={{ width: 3, height: 40, borderRadius: 2, backgroundColor: item.dept_color, opacity: 0.7 }} />
              <V style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: '#0E1525', borderWidth: 1.5, borderColor: col.border, alignItems: 'center', justifyContent: 'center' }}><Tx style={{ fontSize: 19 }}>{item.dept_icon}</Tx></V>
              <V style={{ flex: 1 }}><Tx style={t.h3} numberOfLines={1}>{item.name}</Tx><Tx style={t.sm} numberOfLines={1}>{item.last_message?.content || 'No messages yet'}</Tx></V>
              {item.unread > 0 && <V style={{ backgroundColor: col.blue, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Tx style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{item.unread}</Tx></V>}
            </TO>
          )}
        />
      </Screen>
    );
  }

  const grouped = {};
  allBranches.forEach(b => { if (!grouped[b.companyName]) grouped[b.companyName] = []; grouped[b.companyName].push(b); });

  return (
    <Screen>
      <SV>
        {Object.entries(grouped).map(([coName, branches]) => {
          const co = companies.find(c => c.name === coName);
          return (
            <V key={coName}>
              <V style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
                <Tx style={{ fontSize: 14 }}>{co?.avatar}</Tx>
                <Tx style={{ fontSize: 10, fontWeight: '700', color: co?.color, letterSpacing: 0.6, textTransform: 'uppercase' }}>{coName}</Tx>
                <V style={{ flex: 1, height: 1, backgroundColor: co?.color + '22' }} />
              </V>
              {branches.map(b => (
                <TO key={b.id} onPress={() => setActiveBranch(b)} activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: col.border, backgroundColor: col.card, marginVertical: 2 }}>
                  <V style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: b.color + '22', borderWidth: 2, borderColor: b.color + '33', alignItems: 'center', justifyContent: 'center' }}><Tx style={{ fontSize: 20 }}>{b.avatar}</Tx></V>
                  <V style={{ flex: 1 }}><Tx style={t.h3}>{b.name}</Tx><Tx style={[t.sm, { color: b.color || t.text3, marginTop: 1 }]}>{b.city}</Tx></V>
                  <Tx style={{ fontSize: 18, color: (b.color || col.text3) + '88' }}>›</Tx>
                </TO>
              ))}
            </V>
          );
        })}
      </SV>
    </Screen>
  );
}

// ── Departments Screen ─────────────────────────────────────────────────────────
function DepartmentsScreen({ navigation }) {
  const { departments, chatGroups, companies } = useApp();
  const [filterDept, setFilterDept] = React.useState(null);
  const { View: V, Text: Tx, ScrollView: SV, TouchableOpacity: TO } = require('react-native');
  const { Screen, SectionLabel, C: col, T: t } = require('./src/components/UI');

  const filtered = filterDept ? chatGroups.filter(g => g.department_id === filterDept) : [];

  return (
    <Screen>
      {/* Dept filter chips */}
      <SV horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 7 }}>
        <TO onPress={() => setFilterDept(null)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: !filterDept ? '#2563EB33' : col.border, backgroundColor: !filterDept ? '#1E3A8A' : col.card }}>
          <Tx style={{ fontSize: 11, fontWeight: '700', color: !filterDept ? '#93C5FD' : col.text3 }}>All</Tx>
        </TO>
        {departments.map(d => (
          <TO key={d.id} onPress={() => setFilterDept(filterDept === d.id ? null : d.id)} activeOpacity={0.8}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: filterDept === d.id ? d.color + '44' : col.border, backgroundColor: filterDept === d.id ? d.color + '28' : col.card }}>
            <Tx style={{ fontSize: 11, fontWeight: '700', color: filterDept === d.id ? d.color : col.text3 }}>{d.icon} {d.short_name}</Tx>
          </TO>
        ))}
      </SV>

      <SV>
        {!filterDept ? (
          <>
            <SectionLabel text="All Departments" count={departments.length} />
            {departments.map(d => {
              const total = chatGroups.filter(g => g.department_id === d.id).reduce((a, g) => a + (g.unread || 0), 0);
              return (
                <TO key={d.id} onPress={() => setFilterDept(d.id)} activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: col.border }}>
                  <V style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: d.color + '1E', borderWidth: 1.5, borderColor: d.color + '33', alignItems: 'center', justifyContent: 'center' }}>
                    <Tx style={{ fontSize: 22 }}>{d.icon}</Tx>
                  </V>
                  <V style={{ flex: 1 }}><Tx style={t.h3}>{d.name}</Tx><Tx style={t.sm}>{companies.reduce((a, c) => a + (c.branches?.length || 0), 0)} branch groups</Tx></V>
                  {total > 0 && <V style={{ backgroundColor: d.color, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><Tx style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{total}</Tx></V>}
                  <Tx style={{ fontSize: 16, color: col.text4 }}>›</Tx>
                </TO>
              );
            })}
          </>
        ) : (
          <>
            <SectionLabel text={departments.find(d => d.id === filterDept)?.name + ' · All Branches'} count={filtered.length} />
            {companies.map(co => {
              const coFiltered = filtered.filter(g => g.company_id === co.id);
              if (!coFiltered.length) return null;
              return (
                <V key={co.id}>
                  <V style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }}>
                    <Tx style={{ fontSize: 13 }}>{co.avatar}</Tx>
                    <Tx style={{ fontSize: 10, fontWeight: '700', color: co.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{co.name}</Tx>
                    <V style={{ flex: 1, height: 1, backgroundColor: co.color + '22' }} />
                  </V>
                  {coFiltered.map(g => (
                    <TO key={g.id} onPress={() => navigation.navigate('Chat', { chatType: 'group', chatId: g.id, title: g.name, subtitle: `${g.dept_name} · ${g.branch_name}`, avatar: g.dept_icon, color: g.dept_color })} activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: col.border, backgroundColor: col.card, marginVertical: 2 }}>
                      <V style={{ width: 3, height: 40, borderRadius: 2, backgroundColor: g.dept_color, opacity: 0.7 }} />
                      <V style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#0E1525', borderWidth: 1.5, borderColor: col.border, alignItems: 'center', justifyContent: 'center' }}><Tx style={{ fontSize: 18 }}>{g.dept_icon}</Tx></V>
                      <V style={{ flex: 1 }}><Tx style={t.h3} numberOfLines={1}>{g.name}</Tx><Tx style={t.sm}>{g.branch_name} · {g.city}</Tx></V>
                      {g.unread > 0 && <V style={{ backgroundColor: col.blue, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}><Tx style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{g.unread}</Tx></V>}
                    </TO>
                  ))}
                </V>
              );
            })}
          </>
        )}
      </SV>
    </Screen>
  );
}

// ── Tab icon helper ────────────────────────────────────────────────────────────
function TabIcon({ icon, color, focused }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: focused ? 22 : 20, transform: [{ scale: focused ? 1.1 : 1 }, { translateY: focused ? -2 : 0 }] }}>{icon}</Text>
    </View>
  );
}

// ── Main Tab Navigator ─────────────────────────────────────────────────────────
function MainTabs() {
  const { totalUnread } = useApp();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle, headerTitleStyle,
        tabBarStyle: { backgroundColor: '#080D1A', borderTopColor: C.border, borderTopWidth: 1, height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: '#2D3A50',
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
      }}>
      <Tab.Screen name="ChatList" component={ChatListScreen}
        options={{ title: 'Chat', tabBarLabel: 'Chat', tabBarBadge: totalUnread?.chat || undefined, tabBarIcon: ({ color, focused }) => <TabIcon icon="💬" color={color} focused={focused} /> }} />
      <Tab.Screen name="Groups" component={GroupsScreen}
        options={{ title: 'Groups', tabBarLabel: 'Groups', tabBarBadge: totalUnread?.groups || undefined, tabBarIcon: ({ color, focused }) => <TabIcon icon="👥" color={color} focused={focused} /> }} />
      <Tab.Screen name="Branch" component={BranchScreen}
        options={{ title: 'Branches', tabBarLabel: 'Branch', tabBarIcon: ({ color, focused }) => <TabIcon icon="🌿" color={color} focused={focused} /> }} />
      <Tab.Screen name="Departments" component={DepartmentsScreen}
        options={{ title: 'Departments', tabBarLabel: 'Depts', tabBarIcon: ({ color, focused }) => <TabIcon icon="🏷️" color={color} focused={focused} /> }} />
      <Tab.Screen name="Calls" component={CallsScreen}
        options={{ title: 'Calls', tabBarLabel: 'Calls', tabBarIcon: ({ color, focused }) => <TabIcon icon="📞" color={color} focused={focused} /> }} />
      <Tab.Screen name="Reminders" component={RemindersScreen}
        options={{ title: 'Reminders', tabBarLabel: 'Remind', tabBarIcon: ({ color, focused }) => <TabIcon icon="🔔" color={color} focused={focused} /> }} />
    </Tab.Navigator>
  );
}

// ── Root navigator ─────────────────────────────────────────────────────────────
function Root() {
  const { token, loading } = useApp();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 50 }}>✈️</Text>
        <ActivityIndicator color={C.blue} size="large" />
        <Text style={{ fontSize: 16, color: '#60A5FA', fontWeight: '600' }}>TravKings & Partners</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={{ colors: { background: C.bg } }}>
      <Stack.Navigator screenOptions={{ headerStyle, headerTitleStyle, headerTintColor: C.text }}>
        {!token ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Chat" component={ChatScreen}
              options={({ route }) => ({
                title: route.params?.title || 'Chat',
                headerRight: () => null, // added dynamically in ChatScreen
              })} />
            <Stack.Screen name="Call" component={CallScreen} options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            
            <Stack.Screen name="ManageUser" component={ManageUserScreen} options={{ title: 'Manage User' }} />
            <Stack.Screen name="ManageCompany" component={ManageCompanyScreen} options={{ title: 'Manage Company' }} />
            <Stack.Screen name="ManageBranch" component={ManageBranchScreen} options={{ title: 'Manage Branch' }} />
            <Stack.Screen name="ManageDept" component={ManageDeptScreen} options={{ title: 'Manage Department' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── App entry ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Root />
        </AppProvider>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
