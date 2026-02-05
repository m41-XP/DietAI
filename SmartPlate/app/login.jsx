import React, { useState, useContext } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Alert } from 'react-native';
import api from '../src/services/api';
import { AuthContext } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const response = await api.post('/token/', { email, password });
      // Saving the 'access' token from Django to our Global State
      await login(response.data.access); 
      Alert.alert("Success", "Welcome back!");
      router.replace('/scanner'); // Moves to the scanner after login
    } catch (error) {
      console.error(error);
      Alert.alert("Login Failed", "Check your credentials or Ngrok tunnel.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sign In</Text>
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
      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Enter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  input: { borderBottomWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, fontSize: 16 },
  button: { backgroundColor: '#000', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});