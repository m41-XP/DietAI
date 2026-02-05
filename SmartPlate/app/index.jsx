import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>SmartPlate</Text>
      <Text style={styles.subtitle}>Smart eating, simplified.</Text>

      <Pressable style={styles.loginBtn} onPress={() => router.push('/login')}>
        <Text style={styles.btnText}>Log In</Text>
      </Pressable>

      <Pressable style={styles.guestBtn} onPress={() => router.push('/scanner')}>
        <Text style={[styles.btnText, { color: '#4CAF50' }]}>Continue as Guest</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/register')}>
        <Text style={{ marginTop: 20, color: '#666' }}>New here? Create an account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  logo: { fontSize: 42, fontWeight: 'bold', color: '#4CAF50' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 50 },
  loginBtn: { backgroundColor: '#4CAF50', paddingVertical: 15, paddingHorizontal: 80, borderRadius: 30, marginBottom: 20 },
  guestBtn: { borderWidth: 2, borderColor: '#4CAF50', paddingVertical: 15, paddingHorizontal: 50, borderRadius: 30 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' }
});