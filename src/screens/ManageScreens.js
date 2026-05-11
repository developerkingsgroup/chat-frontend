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

// ── Chip selector ─────────────────────────────────────────────────────────────
function ChipSelect({ label, items, selected, onSelect }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[T.xs, { marginBottom: 8, color: C.text3 }]}>{label}</Text>
      {items.length === 0
        ? <Text style={{ color: C.text3, fontSize: 12 }}>None available</Text>
        : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {items.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => onSelect(item.id)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                  borderWidth: 1,
                  borderColor: selected === item.id ? C.blue : C.border,
                  backgroundColor: selected === item.id ? C.blue + '22' : C.card,
                  marginRight: 8,
                }}>
                <Text style={{ color: selected === item.id ? C.blue : C.text3 }}>
                  {item.avatar ? `${item.avatar} ` : ''}{item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )
      }
    </View>
  );
}

// ── Manage User ───────────────────────────────────────────────────────────────
export function ManageUserScreen({ route, navigation }) {
  const { user } = route.params || {};
  const { companies, departments, loadAll, token } = useApp();

  // Flatten branches from companies
  const allBranches = companies.flatMap(c =>
    (c.branches || []).map(b => ({ ...b, companyName: c.name }))
  );

  const [name,      setName]      = useState(user?.name || '');
  const [email,     setEmail]     = useState(user?.email || '');
  const [mobile,    setMobile]    = useState(user?.mobile || '');
  const [password,  setPassword]  = useState('');
  const [role,      setRole]      = useState(user?.role || 'User');
  const [avatar,    setAvatar]    = useState(user?.avatar || '👤');
  const [color,     setColor]     = useState(user?.color || C.blue);
  const [isAdmin,   setIsAdmin]   = useState(!!user?.is_super_admin);
  const [branchId,  setBranchId]  = useState('');
  const [deptId,    setDeptId]    = useState('');
  const [loading,   setLoading]   = useState(false);

  // Reset dept when branch changes
  useEffect(() => { setDeptId(''); }, [branchId]);

  // Filter departments by selected branch
  const deptsForBranch = departments.filter(d => d.branch_id === branchId);

  const save = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name is required');
    if (!user) {
      if (!email.trim()) return Alert.alert('Error', 'Email is required');
      if (!mobile.trim()) return Alert.alert('Error', 'Mobile number is required');
      if (mobile.trim().length < 7) return Alert.alert('Error', 'Enter a valid mobile number');
      if (!password || password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters');
      if (!isAdmin && !branchId) return Alert.alert('Error', 'Please assign a branch');
      if (!isAdmin && !deptId)   return Alert.alert('Error', 'Please assign a department');
    }
    setLoading(true);
    try {
      if (user) {
        await updateUser(user.id, { name, role, avatar, color, is_super_admin: isAdmin });
      } else {
        await createUser({
          name, email: email.trim(), mobile: mobile.trim(), password,
          role, avatar, color, is_super_admin: isAdmin,
          branches:    isAdmin ? [] : [branchId],
          departments: isAdmin ? [] : [deptId],
        });
      }
      await loadAll(token);
      navigation.goBack();
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Could not save';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
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
        {!user && (
          <Field label="Mobile Number" value={mobile} onChangeText={setMobile}
            placeholder="+911234567890" keyboardType="phone-pad" />
        )}
        {!user && <Field label="Password (min 8 chars)" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />}
        <Field label="Role / Title" value={role} onChangeText={setRole} placeholder="e.g. Sales Manager" />

        <TouchableOpacity onPress={() => setIsAdmin(!isAdmin)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: isAdmin ? C.blue : C.border2, backgroundColor: isAdmin ? C.blue : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {isAdmin && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
          </View>
          <Text style={T.sm}>Grant Super Admin Privileges</Text>
        </TouchableOpacity>

        {/* Branch + Department assignment (not needed for super admins) */}
        {!user && !isAdmin && (
          <>
            <ChipSelect
              label="Assign Branch"
              items={allBranches.map(b => ({ id: b.id, name: `${b.name} (${b.companyName})` }))}
              selected={branchId}
              onSelect={setBranchId}
            />
            <ChipSelect
              label="Assign Department"
              items={deptsForBranch.map(d => ({ id: d.id, name: d.name }))}
              selected={deptId}
              onSelect={setDeptId}
            />
          </>
        )}

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
  const [code,    setCode]    = useState('');
  const [tagline, setTagline] = useState(company?.tagline || '');
  const [avatar,  setAvatar]  = useState(company?.avatar || '🏢');
  const [color,   setColor]   = useState(company?.color || C.blue);
  const [loading, setLoading] = useState(false);

  // Auto-fill code from name when user types (only for new company)
  const handleNameChange = (text) => {
    setName(text);
    if (!company) {
      setCode(text.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase());
    }
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Company name is required');
    if (!company && !code.trim()) return Alert.alert('Error', 'Company code is required');
    if (!company && code.trim().length < 2) return Alert.alert('Error', 'Code must be at least 2 characters');
    setLoading(true);
    try {
      if (company) {
        await updateCompany(company.id, { name: name.trim(), tagline, avatar, color });
      } else {
        await createCompany({ name: name.trim(), code: code.trim().toUpperCase(), tagline, avatar, color });
      }
      await loadAll(token);
      navigation.goBack();
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Could not save';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Header title={company ? 'Edit Company' : 'New Company'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Field label="Company Name" value={name} onChangeText={handleNameChange} placeholder="e.g. TravKings Ltd" />
        {!company && (
          <Field
            label="Company Code (unique, 2-20 chars)"
            value={code}
            onChangeText={t => setCode(t.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
            placeholder="e.g. TRAVKINGS"
            autoCapitalize="characters"
            maxLength={20}
          />
        )}
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
    if (!name.trim()) return Alert.alert('Error', 'Branch name is required');
    if (!companyId) return Alert.alert('Error', 'Please select a company');
    setLoading(true);
    try {
      await createBranch({ company_id: companyId, name: name.trim(), city: city.trim() });
      await loadAll(token);
      navigation.goBack();
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Could not create branch';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Header title="New Branch" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <ChipSelect
          label="Select Company"
          items={companies.map(c => ({ id: c.id, name: c.name, avatar: c.avatar }))}
          selected={companyId}
          onSelect={setCompanyId}
        />
        <Field label="Branch Name" value={name} onChangeText={setName} placeholder="e.g. Head Office" />
        <Field label="City / Address" value={city} onChangeText={setCity} placeholder="e.g. Mumbai" />
        <PrimaryBtn label="Create Branch" onPress={save} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

// ── Manage Department ─────────────────────────────────────────────────────────
export function ManageDeptScreen({ navigation }) {
  const { companies, loadAll, token } = useApp();

  // Flatten all branches from companies (companies already have branches nested)
  const allBranches = companies.flatMap(c =>
    (c.branches || []).map(b => ({ ...b, companyName: c.name }))
  );

  const [companyId,  setCompanyId]  = useState(companies[0]?.id || '');
  const [branchId,   setBranchId]   = useState('');
  const [name,       setName]       = useState('');
  const [shortName,  setShortName]  = useState('');
  const [icon,       setIcon]       = useState('🏷️');
  const [color,      setColor]      = useState(C.purple);
  const [loading,    setLoading]    = useState(false);

  // When company changes, reset branch selection
  useEffect(() => {
    setBranchId('');
  }, [companyId]);

  const branchesForCompany = allBranches.filter(b => b.company_id === companyId);

  const save = async () => {
    if (!name.trim())      return Alert.alert('Error', 'Department name is required');
    if (!shortName.trim()) return Alert.alert('Error', 'Short name (code) is required');
    if (!companyId)        return Alert.alert('Error', 'Please select a company');
    if (!branchId)         return Alert.alert('Error', 'Please select a branch');
    setLoading(true);
    try {
      await createDepartment({
        name: name.trim(),
        short_name: shortName.trim().toUpperCase(),
        icon,
        color,
        branch_id: branchId,
        company_id: companyId,
      });
      await loadAll(token);
      navigation.goBack();
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Could not create department';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Header title="New Department" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <ChipSelect
          label="Select Company"
          items={companies.map(c => ({ id: c.id, name: c.name, avatar: c.avatar }))}
          selected={companyId}
          onSelect={setCompanyId}
        />
        <ChipSelect
          label="Select Branch"
          items={branchesForCompany.map(b => ({ id: b.id, name: b.name }))}
          selected={branchId}
          onSelect={setBranchId}
        />
        <Field label="Department Name" value={name} onChangeText={setName} placeholder="e.g. Marketing" />
        <Field label="Short Code (2-8 chars)" value={shortName} onChangeText={setShortName} placeholder="e.g. MKTG" maxLength={8} autoCapitalize="characters" />
        <Field label="Icon Emoji" value={icon} onChangeText={setIcon} placeholder="🏷️" />
        <Field label="Color" value={color} onChangeText={setColor} placeholder="#8B5CF6" />
        <PrimaryBtn label="Create Department" onPress={save} loading={loading} />
      </ScrollView>
    </Screen>
  );
}
