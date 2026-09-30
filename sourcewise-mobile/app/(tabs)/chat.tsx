import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  TextInput,
  IconButton,
  useTheme,
  Avatar,
  Text,
  Chip,
  Surface,
  Divider,
} from 'react-native-paper';
import { Send, Bot, User, BookOpen, Lightbulb, Copy, RefreshCw } from 'lucide-react-native';
import { useTutorStore, Message, TutoringMode } from '../../store/tutorStore';
import { useAuthStore } from '../../store/authStore';

const MODE_OPTIONS: { key: TutoringMode; label: string; icon: string }[] = [
  { key: 'friendly', label: 'Friendly', icon: '😊' },
  { key: 'tutor', label: 'Tutor', icon: '🎓' },
  { key: 'mentor', label: 'Mentor', icon: '💡' },
];

const TypingIndicator = () => (
  <View style={styles.typingContainer}>
    <View style={styles.typingBubble}>
      <ActivityIndicator size="small" color="#7B1842" />
      <Text style={styles.typingText}>Thinking...</Text>
    </View>
  </View>
);

const CitationCard = ({ citation }: { citation: any }) => (
  <Surface style={styles.citationCard} elevation={1}>
    <View style={styles.citationHeader}>
      <BookOpen size={14} color="#7B1842" />
      <Text style={styles.citationSource}>
        {citation.source_name} (p.{citation.page})
      </Text>
    </View>
    <Text style={styles.citationText} numberOfLines={3}>
      {citation.text}
    </Text>
  </Surface>
);

const AlternativeCard = ({ alternative }: { alternative: any }) => (
  <Surface style={styles.alternativeCard} elevation={1}>
    <View style={styles.alternativeHeader}>
      <Lightbulb size={14} color="#7B1842" />
      <Text style={styles.alternativeStrategy}>
        {alternative.strategy.charAt(0).toUpperCase() + alternative.strategy.slice(1)} explanation
      </Text>
    </View>
    <Text style={styles.alternativeContent} numberOfLines={4}>
      {alternative.content}
    </Text>
    <Text style={styles.alternativeHint}>{alternative.when_to_use}</Text>
  </Surface>
);

const MessageBubble = ({ message, theme }: { message: Message; theme: any }) => {
  const isUser = message.sender === 'user';

  if (message.isLoading) {
    return (
      <View style={[styles.messageWrapper, styles.aiWrapper]}>
        <Avatar.Icon size={32} icon="robot" style={styles.aiAvatar} />
        <TypingIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.messageWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
      {!isUser && <Avatar.Icon size={32} icon="robot" style={styles.aiAvatar} />}

      <View style={styles.messageContent}>
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: theme.colors.primary }]
              : [styles.aiBubble, { backgroundColor: theme.colors.surfaceVariant }],
          ]}
        >
          <Text
            style={isUser ? styles.userText : styles.aiText}
            selectable
          >
            {message.text}
          </Text>
        </View>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <View style={styles.citationsContainer}>
            <Text style={styles.sectionLabel}>Sources:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {message.citations.map((citation, idx) => (
                <CitationCard key={idx} citation={citation} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Alternative explanations */}
        {message.alternatives && message.alternatives.length > 0 && (
          <View style={styles.alternativesContainer}>
            <Text style={styles.sectionLabel}>Alternative explanations:</Text>
            {message.alternatives.map((alt, idx) => (
              <AlternativeCard key={idx} alternative={alt} />
            ))}
          </View>
        )}

        {/* Related concepts */}
        {message.relatedConcepts && message.relatedConcepts.length > 0 && (
          <View style={styles.conceptsContainer}>
            <Text style={styles.sectionLabel}>Related topics:</Text>
            <View style={styles.chipsRow}>
              {message.relatedConcepts.map((concept, idx) => (
                <Chip key={idx} style={styles.conceptChip} textStyle={styles.conceptChipText}>
                  {concept.concept}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {/* Practice suggestions */}
        {message.practiceSuggestions && message.practiceSuggestions.length > 0 && (
          <View style={styles.practiceContainer}>
            <Text style={styles.sectionLabel}>Practice suggestions:</Text>
            {message.practiceSuggestions.map((suggestion, idx) => (
              <Surface key={idx} style={styles.practiceCard} elevation={1}>
                <Text style={styles.practiceReason}>{suggestion.reason}</Text>
                <Text style={styles.practiceDifficulty}>
                  Difficulty: {'⭐'.repeat(suggestion.difficulty)}
                </Text>
              </Surface>
            ))}
          </View>
        )}

        {/* Copy button for AI messages */}
        {!isUser && (
          <TouchableOpacity style={styles.copyButton}>
            <Copy size={14} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {isUser && <Avatar.Icon size={32} icon="account" style={styles.userAvatar} />}
    </View>
  );
};

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const theme = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const authStore = useAuthStore();
  const {
    messages,
    isStreaming,
    currentMode,
    setCurrentMode,
    sendMessage,
    startSession,
    selectedSourceIds,
    sessionActive,
  } = useTutorStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isStreaming) return;

    const textToSend = message.trim();
    setMessage('');

    // Start session if not active
    if (!sessionActive && selectedSourceIds.length > 0) {
      await startSession(selectedSourceIds, currentMode);
    }

    // Send message
    await sendMessage(textToSend, authStore.token || '');
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} theme={theme} />
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Mode selector */}
      <View style={[styles.modeSelector, { backgroundColor: theme.colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MODE_OPTIONS.map((mode) => (
            <Chip
              key={mode.key}
              selected={currentMode === mode.key}
              onPress={() => setCurrentMode(mode.key)}
              style={[
                styles.modeChip,
                currentMode === mode.key && { backgroundColor: theme.colors.primary },
              ]}
              textStyle={[
                styles.modeChipText,
                currentMode === mode.key && { color: '#FFF' },
              ]}
            >
              {mode.icon} {mode.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={renderMessage}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={64} icon="robot" style={styles.emptyAvatar} />
            <Text style={styles.emptyTitle}>SourceWise AI</Text>
            <Text style={styles.emptySubtitle}>
              Your friendly study companion. Ask me anything about your sources!
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          mode="flat"
          placeholder="Ask anything..."
          value={message}
          onChangeText={setMessage}
          style={styles.input}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          multiline
          maxLength={4000}
        />
        <IconButton
          icon="send"
          mode="contained"
          containerColor={theme.colors.primary}
          iconColor="white"
          size={24}
          onPress={handleSend}
          disabled={!message.trim() || isStreaming}
          loading={isStreaming}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeSelector: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modeChip: {
    marginRight: 8,
    height: 36,
  },
  modeChipText: {
    fontSize: 13,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  messageContent: {
    maxWidth: '80%',
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    marginLeft: 8,
  },
  userBubble: {
    borderBottomRightRadius: 4,
    marginRight: 8,
  },
  aiText: {
    color: '#1a1a1a',
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
  },
  typingContainer: {
    marginLeft: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: '#E8E0E8',
    gap: 8,
  },
  typingText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 120,
    backgroundColor: 'transparent',
  },
  aiAvatar: {
    backgroundColor: '#7B1842',
  },
  userAvatar: {
    backgroundColor: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyAvatar: {
    backgroundColor: '#7B1842',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Citations
  citationsContainer: {
    marginTop: 8,
    marginLeft: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  citationCard: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    width: 200,
    backgroundColor: '#f5f0f5',
  },
  citationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  citationSource: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7B1842',
  },
  citationText: {
    fontSize: 11,
    color: '#444',
    lineHeight: 16,
  },
  // Alternatives
  alternativesContainer: {
    marginTop: 8,
    marginLeft: 8,
  },
  alternativeCard: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#f5f0f5',
  },
  alternativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  alternativeStrategy: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7B1842',
  },
  alternativeContent: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    marginBottom: 4,
  },
  alternativeHint: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  // Concepts
  conceptsContainer: {
    marginTop: 8,
    marginLeft: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conceptChip: {
    height: 28,
    backgroundColor: '#E8E0E8',
  },
  conceptChipText: {
    fontSize: 12,
  },
  // Practice
  practiceContainer: {
    marginTop: 8,
    marginLeft: 8,
  },
  practiceCard: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#f5f0f5',
  },
  practiceReason: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
  practiceDifficulty: {
    fontSize: 11,
    color: '#888',
  },
  // Copy button
  copyButton: {
    marginTop: 4,
    marginLeft: 8,
    padding: 4,
    alignSelf: 'flex-start',
  },
});
