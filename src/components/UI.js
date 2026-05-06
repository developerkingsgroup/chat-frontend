// src/components/UI.js — Design tokens & shared components
import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet,
} from 'react-native';

// ── Design Tokens ─────────────────────────────────────────────────────────────
export const C = {
  bg:      '#080D1A',
  surface: '#0B1020',
  card:    '#0D1422',
  border:  '#111828',
  border2: '#1A2440',
  text:    '#E2E8F0',
  text2:   '#CBD5E1',
  text3:   '#64748B',
  text4:   '#2D3A50',
  blue:    '#3B82F6',
  blue2:   '#1D4ED8',
  green:   '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  purple:  '#8B5CF6',
  pink:    '#EC4899',
};

export const T = {
  h1:   { fontSize:20, fontWeight:'700', color:C.text,  fontFamily:'System' },
  h2:   { fontSize:16, fontWeight:'700', color:C.text,  fontFamily:'System' },
  h3:   { fontSize:14, fontWeight:'600', color:C.text2, fontFamily:'System' },
  body: { fontSize:14, fontWeight:'400', color:C.text2, lineHeight:20, fontFamily:'System' },
  sm:   { fontSize:12, fontWeight:'400', color:C.text3, fontFamily:'System' },
  xs:   { fontSize:10, fontWeight:'700', color:C.text4, letterSpacing:0.6, fontFamily:'System' },
};

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ emoji='👤', color=C.blue, size=44, style }) {
  return (
    <View style={[{
      width:size, height:size, borderRadius:size*0.25,
      backgroundColor:color+'22', borderWidth:1.5, borderColor:color+'44',
      alignItems:'center', justifyContent:'center',
    }, style]}>
      <Text style={{ fontSize:size*0.48 }}>{emoji}</Text>
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ count }) {
  if (!count) return null;
  return (
    <View style={{ backgroundColor:C.blue, minWidth:18, height:18, borderRadius:9, alignItems:'center', justifyContent:'center', paddingHorizontal:3 }}>
      <Text style={{ color:'#fff', fontSize:10, fontWeight:'700' }}>{count>99?'99+':count}</Text>
    </View>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────
export function Pill({ label, color=C.blue, small=false }) {
  return (
    <View style={{ backgroundColor:color+'1E', borderRadius:999, paddingHorizontal:7, paddingVertical:2 }}>
      <Text style={{ color, fontSize:small?9:11, fontWeight:'600' }}>{label}</Text>
    </View>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ text, count }) {
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:14, paddingTop:14, paddingBottom:5 }}>
      <Text style={[T.xs, { textTransform:'uppercase' }]}>{text}</Text>
      {count!=null && (
        <View style={{ backgroundColor:C.border2, borderRadius:999, paddingHorizontal:6, paddingVertical:1 }}>
          <Text style={{ fontSize:10, fontWeight:'700', color:C.text3 }}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ── Primary button ────────────────────────────────────────────────────────────
export function PrimaryBtn({ label, onPress, disabled, color, loading:load, style }) {
  const bg = disabled ? C.card : (color||C.blue2);
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled||load} activeOpacity={0.82}
      style={[{ backgroundColor:bg, borderRadius:12, paddingVertical:14, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:8 }, style]}>
      {load
        ? <ActivityIndicator color='#fff' size='small'/>
        : <Text style={{ color:disabled?C.text4:'#fff', fontSize:15, fontWeight:'700' }}>{label}</Text>}
    </TouchableOpacity>
  );
}

// ── Field (labelled input) ────────────────────────────────────────────────────
export function Field({ label, style, inputStyle, ...props }) {
  return (
    <View style={[{ marginBottom:14 }, style]}>
      {label && <Text style={[T.xs, { textTransform:'uppercase', marginBottom:7 }]}>{label}</Text>}
      <TextInput
        placeholderTextColor={C.text4}
        style={[{
          backgroundColor:C.card, borderWidth:1.5, borderColor:C.border2,
          borderRadius:10, paddingHorizontal:13, paddingVertical:11,
          fontSize:14, color:C.text, fontFamily:'System',
        }, inputStyle]}
        {...props}
      />
    </View>
  );
}

// ── Row (list item) ───────────────────────────────────────────────────────────
export function Row({ children, onPress, active, style }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[{
        flexDirection:'row', alignItems:'center', gap:12,
        paddingHorizontal:14, paddingVertical:11, marginHorizontal:8, marginVertical:2,
        borderRadius:12, borderWidth:1,
        borderColor: active ? '#2563EB22' : C.border,
        backgroundColor: active ? '#162040' : C.card,
      }, style]}>
      {children}
    </TouchableOpacity>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <View style={[{ backgroundColor:C.card, borderRadius:14, borderWidth:1, borderColor:C.border, marginHorizontal:14, marginTop:10, padding:14 }, style]}>
      {children}
    </View>
  );
}

// ── Screen wrapper ────────────────────────────────────────────────────────────
export function Screen({ children, style }) {
  return <View style={[{ flex:1, backgroundColor:C.bg }, style]}>{children}</View>;
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon='📭', text='Nothing here yet' }) {
  return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center', gap:12, padding:32 }}>
      <Text style={{ fontSize:44 }}>{icon}</Text>
      <Text style={[T.sm, { textAlign:'center' }]}>{text}</Text>
    </View>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
export function Toggle({ value, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}
      style={{ width:44, height:26, borderRadius:13, backgroundColor:value?C.blue2:'#1A2440', justifyContent:'center', paddingHorizontal:3 }}>
      <View style={{ width:20, height:20, borderRadius:10, backgroundColor:'#fff', alignSelf:value?'flex-end':'flex-start', shadowColor:'#000', shadowOpacity:0.3, shadowRadius:2, shadowOffset:{width:0,height:1} }}/>
    </TouchableOpacity>
  );
}

// ── Status / Priority configs ─────────────────────────────────────────────────
export const PRIORITY = {
  high:   { label:'High',   color:C.red,    bg:C.red   +'22', icon:'🔴' },
  medium: { label:'Medium', color:C.amber,  bg:C.amber +'22', icon:'🟡' },
  low:    { label:'Low',    color:C.green,  bg:C.green +'22', icon:'🟢' },
};

export const STATUS = {
  pending:  { label:'Pending',      color:C.blue,   bg:C.blue  +'18', icon:'🕐' },
  review:   { label:'Under Review', color:C.amber,  bg:C.amber +'18', icon:'🔍' },
  approved: { label:'Approved',     color:C.green,  bg:C.green +'18', icon:'✅' },
  rejected: { label:'Rejected',     color:C.red,    bg:C.red   +'18', icon:'❌' },
};