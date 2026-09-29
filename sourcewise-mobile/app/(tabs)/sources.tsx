import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Card, Searchbar, FAB, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import { FileText, MoreVertical, FileCode, FileImage } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../utils/api';

interface Source {
  id: string;
  title: string;
  type: string;
  date: string;
}

export default function SourcesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const { token } = useAuthStore();

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/sources`, { headers });
      if (response.ok) {
        const data = await response.json();
        const sourcesList = data.sources || data || [];
        setSources(sourcesList.map((s: any) => ({
          id: s.id,
          title: s.name || s.title || 'Untitled',
          type: s.type || 'pdf',
          date: s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Unknown date',
        })));
      }
    } catch (err) {
      console.error('[Sources] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText size={24} color={theme.colors.primary} />;
      case 'image': return <FileImage size={24} color="#E91E63" />;
      default: return <FileCode size={24} color="#673AB7" />;
    }
  };

  const filteredSources = sources.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search sources..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredSources}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Title
                title={item.title}
                subtitle={`Added on ${item.date}`}
                left={() => renderIcon(item.type)}
                right={(props) => <IconButton {...props} icon="dots-vertical" onPress={() => {}} />}
              />
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyMedium" style={styles.emptyText}>
                No sources yet. Upload documents from the web app to get started.
              </Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        label="Add Source"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="white"
        onPress={() => console.log('Add source')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    borderRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
});
