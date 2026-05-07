// src/screens/ManageScreens.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useApp } from '../context/AppContext';
import { 
  createUser, updateUser, deleteUser,
  createCompany, updateCompany, deleteCompany,
  createBranch, updateBranch,
  createDepartment
} from '../utils/api';
import { C, T, Screen, Field, PrimaryBtn, Card, Avatar } from '../components/UI';

// ── Shared Header ─────────────────────────────────────────────────────────────
function Header({ title, onBack, right }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <TouchableOpacity onPress={onBack} style={{ backgroundColor: C.card, width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, color: C.text2 }}>‹</Text>
      </TouchableOpacity>
      <Text style={[T.h2, { flex: 1 }]}>{title}</Text>
      {right}
    </View>
  );
}

// ── Manage User ───────────────────────────────────────────────────────────────
export function ManageUserScreen({ route, navigation }) {
  const { user } = route.params || {};
  const { companies, departments, loadAll, token } = useApp();
  
  const [name,     setName]     = useState(user?.name || '');
  const [email,    setEmail]    = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState(user?.role || 'User');
  const [avatar,   setAvatar]   = useState(user?.avatar || '👤');
  const [color,    setColor]    = useState(user?.color || C.blue);
  const [isAdmin,  setIsAdmin]  = useState(!!user?.is_super_admin);
  const [loading,  setLoading]  = useState(false);

  // For simplicity, we just save the basic info. 
  // In a real app, we'd also handle company/branch/dept assignments.

  const save = async () => {
    if (!name || !email || (!user && !password)) return Alert.alert('Error', 'Missing fields');
    setLoading(true);
    try {
      if (user) {
        await updateUser(user.id, { name, role, avatar, color, is_super_admin: isAdmin });
      } else {
        await createUser({ name, email, password, role, avatar, color, is_super_admin: isAdmin });
      }
      await loadAll(token);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not save');
    } finally {
      setLoading(false);
    }
  };

  const del = () => {
    Alert.alert('Delete User', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteUser(user.id); await loadAll(token); navigation.goBack(); } catch {}
      }}
    ]);
  };

  return (
    <Screen>
      <Header title={user ? 'Edit User' : 'Create User'} onBack={() => navigation.goBack()} 
        right={user && <TouchableOpacity onPress={del}><Text style={{color:C.red, fontSize:13, fontWeight:'600'}}>Delete</Text></TouchableOpacity>} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Avatar emoji={avatar} color={color} size={80} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {['👤', '👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '🦸'].map(e => (
              <TouchableOpacity key={e} onPress={() => setAvatar(e)} style={{ padding: 8, backgroundColor: avatar === e ? C.border2 : 'transparent', borderRadius: 8 }}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Field label="Full Name" value={name} onChangeText={setName} placeholder="John Doe" />
        <Field label="Email Address" value={email} onChangeText={setEmail} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" editable={!user} />
        {!user && <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />}
        <Field label="Role / Title" value={role} onChangeText={setRole} placeholder="e.g. Sales Manager" />
        
        <TouchableOpacity onPress={() => setIsAdmin(!isAdmin)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: isAdmin ? C.blue : C.border2, backgroundColor: isAdmin ? C.blue : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {isAdmin && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
          </View>
          <Text style={T.sm}>Grant Super Admin Privileges</Text>
        </TouchableOpacity>

        <PrimaryBtn label={user ? 'Save Changes' : 'Create User'} onPress={save} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

// ── Manage Company ────────────────────────────────────────────────────────────
export function ManageCompanyScreen({ route, navigation }) {
  const { company } = route.params || {};
  const { loadAll, token } = useApp();
  
  const [name,    setName]    = useState(company?.name || '');
  const [tagline, setTagline] = useState(company?.tagline || '');
  const [avatar,  setAvatar]  = useState(company?.avatar || '🏢');
  const [color,   setColor]   = useState(company?.color || C.blue);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name) return Alert.alert('Error', 'Name required');
    setLoading(true);
    try {
      if (company) await updateCompany(company.id, { name, tagline, avatar, color });
      else await createCompany({ name, tagline, avatar, color });
      await loadAll(token);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not save');
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Header title={company ? 'Edit Company' : 'New Company'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Field label="Company Name" value={name} onChangeText={setName} placeholder="e.g. TravKings Ltd" />
        <Field label="Tagline" value={tagline} onChangeText={setTagline} placeholder="e.g. Travel with ease" />
        <Field label="Avatar Emoji" value={avatar} onChangeText={setAvatar} placeholder="🏢" />
        <Field label="Theme Color" value={color} onChangeText={setColor} placeholder="#3B82F6" />
        <PrimaryBtn label={company ? 'Save Changes' : 'Create Company'} onPress={save} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

// ── Manage Branch ─────────────────────────────────────────────────────────────
export function ManageBranchScreen({ route, navigation }) {
  const { companies, loadAll, token } = useApp();
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [name,      setName]      = useState('');
  const [city,      setCity]      = useState('');
  const [loading,   setLoading]   = useState(false);

  const save = async () => {
    if (!name || !companyId) return Alert.alert('Error', 'Missing fields');
    setLoading(true);
    try {
      await createBranch({ company_id: companyId, name, city });
      await loadAll(token);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not create branch');
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Header title="New Branch" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[T.xs, { marginBottom: 8 }]}>Select Company</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {companies.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setCompanyId(c.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: companyId === c.id ? C.blue : C.border, backgroundColor: companyId === c.id ? C.blue + '22' : C.card, marginRight: 8 }}>
              <Text style={{ color: companyId === c.id ? C.blue : C.text3 }}>{c.avatar} {c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Field label="Branch Name" value={name} onChangeText={setName} placeholder="e.g. Head Office" />
        <Field label="City" value={city} onChangeText={setCity} placeholder="e.g. London" />
        <PrimaryBtn label="Create Branch" onPress={save} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

// ── Manage Department ─────────────────────────────────────────────────────────
export function ManageDeptScreen({ navigation }) {
  const { loadAll, token } = useApp();
  const [name,      setName]      = useState('');
  const [shortName, setShortName] = useState('');
  const [icon,      setIcon]      = useState('🏷️');
  const [color,     setColor]     = useState(C.purple);
  const [loading,   setLoading]   = useState(false);

  const save = async () => {
    if (!name || !shortName) return Alert.alert('Error', 'Missing fields');
    setLoading(true);
    try {
      await createDepartment({ name, short_name: shortName, icon, color });
      await loadAll(token);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not create department');
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Header title="New Department" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Field label="Department Name" value={name} onChangeText={setName} placeholder="e.g. Marketing" />
        <Field label="Short Name" value={shortName} onChangeText={setShortName} placeholder="e.g. MKTG" maxLength={4} />
        <Field label="Icon Emoji" value={icon} onChangeText={setIcon} placeholder="🏷️" />
        <Field label="Color" value={color} onChangeText={setColor} placeholder="#8B5CF6" />
        <PrimaryBtn label="Create Department" onPress={save} loading={loading} />
      </ScrollView>
    </Screen>
  );
}
