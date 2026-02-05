import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Alert } from 'react-native';
import api from '../src/services/api';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    try {
      // Sending data to your Django /api/register/ endpoint
      await api.post('/register/', { email, password });
      Alert.alert("Success", "Account created! Please log in.");
      router.replace('/login'); 
    } catch (error) {
      console.error(error);
      Alert.alert("Registration Failed", "Email may already be taken or server is down.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Join SmartPlate</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        onChangeText={setEmail} 
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        secureTextEntry 
        onChangeText={setPassword} 
      />
      <Pressable style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </Pressable>
      <Text style={styles.footerText} onPress={() => router.push('/login')}>
        Already have an account? Log In
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  input: { borderBottomWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, fontSize: 16 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  footerText: { marginTop: 20, textAlign: 'center', color: '#666' }
});