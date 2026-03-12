import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <TouchableOpacity onPress={() => router.replace('/')}>
        <Text style={styles.link}>Go home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '600' },
  link: { color: '#007AFF', marginTop: 16, fontSize: 16 },
});
