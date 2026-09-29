import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Text, Card, Title, Paragraph, Button, useTheme, Avatar, ActivityIndicator } from 'react-native-paper';
import { BrainCircuit, Clock, BookOpen, MessageSquare } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../utils/api';

interface DashboardData {
  sourcesCount: number;
  recentSessions: any[];
  studyStreak: number;
}

export default function Dashboard() {
  const theme = useTheme();
  const { user, token } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [sourcesRes, tutorRes] = await Promise.allSettled([
        fetch(`${API_URL}/sources`, { headers }),
        fetch(`${API_URL}/tutor/history`, { headers }),
      ]);

      let sourcesCount = 0;
      let recentSessions: any[] = [];

      if (sourcesRes.status === 'fulfilled' && sourcesRes.value.ok) {
        const data = await sourcesRes.value.json();
        sourcesCount = data.sources?.length || data.length || 0;
      }

      if (tutorRes.status === 'fulfilled' && tutorRes.value.ok) {
        const data = await tutorRes.value.json();
        recentSessions = data.sessions?.slice(0, 3) || [];
      }

      setDashboardData({
        sourcesCount,
        recentSessions,
        studyStreak: recentSessions.length,
      });
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Title style={styles.nameText}>{user?.name || 'Student'}</Title>
        </View>
        <Avatar.Icon size={48} icon="account" style={{ backgroundColor: theme.colors.primary }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <BrainCircuit size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{dashboardData?.sourcesCount || 0}</Text>
                <Text style={styles.statLabel}>Sources</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MessageSquare size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{dashboardData?.recentSessions?.length || 0}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </Card.Content>
            </Card>
          </View>

          <Title style={styles.sectionTitle}>Recent Sessions</Title>
          {dashboardData?.recentSessions && dashboardData.recentSessions.length > 0 ? (
            dashboardData.recentSessions.map((session, index) => (
              <Card key={session.id || index} style={styles.recentCard}>
                <Card.Content style={styles.recentContent}>
                  <View style={styles.iconCircle}>
                    <BookOpen size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.recentInfo}>
                    <Text variant="titleMedium">{session.mode || 'Study Session'}</Text>
                    <Text variant="bodySmall">{session.preview || 'No preview available'}</Text>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Card style={styles.recentCard}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: '#666', textAlign: 'center' }}>
                  No sessions yet. Upload sources and start studying!
                </Text>
              </Card.Content>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recentCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  recentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDF2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
});
