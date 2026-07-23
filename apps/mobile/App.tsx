import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, useColorScheme } from 'react-native';
import { useMemo, useState } from 'react';
import type { Item } from '@starvault/core';

const Stack = createNativeStackNavigator();

const MOCK_ITEMS: Item[] = [
  {
    id: '1',
    type: 'github',
    sourceUrl: 'https://github.com/TaotaoByte/StarVault',
    title: 'StarVault',
    description: 'AI驱动的全平台收藏管理工具',
    githubOwner: 'TaotaoByte',
    githubRepo: 'StarVault',
    githubStars: 0,
    githubForks: 0,
    githubLanguage: 'TypeScript',
    githubTopics: ['react', 'sqlite', 'ai'],
    readmeContent: null,
    readmeSummary: null,
    lastSyncAt: null,
    iconUrl: null,
    screenshotUrls: [],
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userCreated: false,
    isArchived: false,
    tags: ['react', 'sqlite'],
  },
];

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'StarVault' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: '详情' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function HomeScreen({ navigation }: { navigation: any }) {
  const scheme = useColorScheme();
  const styles = useMemo(() => createStyles(scheme ?? 'light'), [scheme]);
  const [query, setQuery] = useState('');
  const items = MOCK_ITEMS.filter(i => i.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="搜索收藏..."
        placeholderTextColor={scheme === 'dark' ? '#94a3b8' : '#64748b'}
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Detail', { item })}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc} numberOfLines={2}>
              {item.readmeSummary || item.description || '暂无描述'}
            </Text>
            <Text style={styles.meta}>{item.githubLanguage ?? 'website'}</Text>
          </TouchableOpacity>
        )}
      />
      <StatusBar style="auto" />
    </View>
  );
}

function DetailScreen({ route }: { route: any }) {
  const scheme = useColorScheme();
  const styles = useMemo(() => createStyles(scheme ?? 'light'), [scheme]);
  const item: Item = route.params.item;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.desc}>{item.sourceUrl}</Text>
      <Text style={styles.desc}>{item.readmeSummary || item.description || '暂无描述'}</Text>
    </View>
  );
}

const createStyles = (scheme: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: scheme === 'dark' ? '#0f172a' : '#ffffff',
      padding: 16,
    },
    input: {
      borderWidth: 1,
      borderColor: scheme === 'dark' ? '#334155' : '#e2e8f0',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      color: scheme === 'dark' ? '#f8fafc' : '#0f172a',
      backgroundColor: scheme === 'dark' ? '#1e293b' : '#f8fafc',
    },
    card: {
      backgroundColor: scheme === 'dark' ? '#1e293b' : '#f8fafc',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: scheme === 'dark' ? '#334155' : '#e2e8f0',
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: scheme === 'dark' ? '#f8fafc' : '#0f172a',
      marginBottom: 4,
    },
    desc: {
      fontSize: 14,
      color: scheme === 'dark' ? '#94a3b8' : '#475569',
      marginBottom: 8,
    },
    meta: {
      fontSize: 12,
      color: '#3b82f6',
    },
  });
