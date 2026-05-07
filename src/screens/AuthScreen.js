// src/screens/AuthScreen.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { BASE_URL, login, register } from '../utils/api';
import { C, T, Field, PrimaryBtn } from '../components/UI';

const ROLES = ['User','Branch Manager','General Manager','Finance Head','Marketing Lead','Ticketing Exec'];

export default function AuthScreen() {
  const { signIn } = useApp();
  const [mode,     setMode]     = useState('login');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('User');
  const [busy,     setBusy]     = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) return Alert.alert('Error','Email and password required');
    if (mode==='register' && !name.trim()) return Alert.alert('Error','Full name required');
    setBusy(true);
    try {
      const res = mode==='login'
        ? await login(email.trim(), password)
        : await register({ name:name.trim(), email:email.trim(), password, role });
      await signIn(res.data.token, res.data.user);
    } catch (e) {
      console.log("eeeeee",JSON.stringify(e))
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong. Check your connection.');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, backgroundColor:C.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow:1, justifyContent:'center', padding:24 }} keyboardShouldPersistTaps='handled'>

        {/* Logo */}
        <View style={{ alignItems:'center', marginBottom:40 }}>
          <Text style={{ fontSize:56, marginBottom:10 }}>✈️🏨</Text>
          <Text style={{ fontSize:24, fontWeight:'700', color:C.blue, fontFamily:'Courier New' }}>TravKings & Partners dd</Text>
          <Text style={[T.sm, { marginTop:4 }]}>Internal messaging platform {BASE_URL}</Text>
        </View>

        {/* Mode tabs */}
        <View style={{ flexDirection:'row', backgroundColor:C.surface, borderRadius:12, padding:4, marginBottom:24 }}>
          {['login','register'].map(m => (
            <TouchableOpacity key={m} onPress={()=>setMode(m)} activeOpacity={0.85}
              style={{ flex:1, paddingVertical:10, borderRadius:9, backgroundColor:mode===m?C.blue2:'transparent', alignItems:'center' }}>
              <Text style={{ color:mode===m?'#fff':C.text3, fontWeight:'600', fontSize:14, textTransform:'capitalize' }}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fields */}
        {mode==='register' && <Field label='Full Name' placeholder='e.g. Sarah Johnson' value={name} onChangeText={setName} autoCapitalize='words'/>}
        <Field label='Email Address' placeholder='you@company.com' value={email} onChangeText={setEmail} autoCapitalize='none' keyboardType='email-address' autoCorrect={false}/>
        <Field label='Password' placeholder='••••••••' value={password} onChangeText={setPassword} secureTextEntry/>

        {/* Role picker (register only) */}
        {mode==='register' && (
          <View style={{ marginBottom:20 }}>
            <Text style={[T.xs, { textTransform:'uppercase', marginBottom:8 }]}>Role / Designation</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
              {ROLES.map(r => (
                <TouchableOpacity key={r} onPress={()=>setRole(r)} activeOpacity={0.85}
                  style={{ paddingHorizontal:13, paddingVertical:7, borderRadius:999, borderWidth:1.5, borderColor:role===r?C.blue:C.border2, backgroundColor:role===r?C.blue+'22':C.card }}>
                  <Text style={{ fontSize:12, fontWeight:'600', color:role===r?C.blue:C.text3 }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <PrimaryBtn label={mode==='login'?'Sign In':'Create Account'} onPress={submit} loading={busy}/>

        <TouchableOpacity onPress={()=>setMode(mode==='login'?'register':'login')} style={{ marginTop:16, alignItems:'center' }}>
          <Text style={T.sm}>
            {mode==='login'?"Don't have an account? ":"Already have an account? "}
            <Text style={{ color:C.blue, fontWeight:'600' }}>{mode==='login'?'Register':'Login'}</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}