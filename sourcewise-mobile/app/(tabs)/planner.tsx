import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, Title, List, useTheme, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { Calendar, CheckCircle2, Circle } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../utils/api';

interface StudyPlan {
  id: string;
  title: string;
  time: string;
  task: string;
  completed: boolean;
}

export default function PlannerScreen() {
  const theme = useTheme();
  const { token } = useAuthStore();
  const [studyPlan, setStudyPlan] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlannerData();
  }, []);

  const fetchPlannerData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/planner`, { headers });
      if (response.ok) {
        const data = await response.json();
        const plans = data.plans || data.tasks || data.sessions || [];
        setStudyPlan(plans.map((p: any) => ({
          id: p.id,
          title: p.title || p.name || 'Study Session',
          time: p.time || p.scheduled_time || 'Flexible',
          task: p.description || p.task || p.topic || 'Study task',
          completed: p.completed || p.done || false,
        })));
      }
    } catch (err) {
      console.error('[Planner] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = studyPlan.filter(item => item.completed).length;
  const progress = studyPlan.length > 0 ? completedCount / studyPlan.length : 0;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryHeader}>
            <Title>Today's Progress</Title>
            <Text variant="titleLarge" style={{ color: theme.colors.primary }}>
              {studyPlan.length > 0 ? `${Math.round(progress * 100)}%` : '0%'}
            </Text>
          </View>
          <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progress} />
          <Text variant="bodySmall" style={styles.summaryText}>
            {studyPlan.length > 0
              ? `${completedCount} of ${studyPlan.length} sessions completed`
              : 'No sessions scheduled yet'}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.listHeader}>
        <Calendar size={20} color={theme.colors.primary} />
        <Text variant="titleMedium" style={styles.dateText}>{today}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : studyPlan.length > 0 ? (
        studyPlan.map((item) => (
          <Card key={item.id} style={styles.planCard} mode="elevated">
            <Card.Content style={styles.planContent}>
              <View style={styles.checkboxContainer}>
                {item.completed ? (
                  <CheckCircle2 size={24} color={theme.colors.primary} />
                ) : (
                  <Circle size={24} color="#CCC" />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text variant="titleSmall" style={item.completed ? styles.completedText : null}>
                  {item.title}
                </Text>
                <Text variant="bodyMedium" style={styles.planTask}>{item.task}</Text>
                <Text variant="labelSmall" style={styles.planTime}>{item.time}</Text>
              </View>
            </Card.Content>
          </Card>
        ))
      ) : (
        <Card style={styles.planCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: '#666', textAlign: 'center' }}>
              No study sessions scheduled. Create a study plan from the web app to get started.
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: '#FFF',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progress: {
    height: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  summaryText: {
    color: '#666',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  planCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planTask: {
    marginTop: 2,
    color: '#333',
  },
  planTime: {
    marginTop: 4,
    color: '#666',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#AAA',
  },
});
