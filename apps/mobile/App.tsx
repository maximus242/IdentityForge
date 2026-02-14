import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Type definitions
type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  ValuesDiscovery: undefined;
  IdentityCraft: undefined;
  DailyEntry: undefined;
  Coach: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Theme colors
const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  background: '#f8f9fa',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#dddddd',
};

// Login Screen
function LoginScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>IdentityForge</Text>
          <Text style={styles.subtitle}>Reconnect with who you truly are</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.primaryButtonText}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchButtonText}>
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>What is IdentityForge?</Text>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureText}>Discover your core values through conversation</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✨</Text>
            <Text style={styles.featureText}>Craft your extraordinary self identity</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📝</Text>
            <Text style={styles.featureText}>Daily reflection aligned with who you want to be</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Dashboard Screen
function DashboardScreen({ navigation }: { navigation: any }) {
  const stats = {
    streak: 5,
    totalEntries: 12,
    avgEnergy: 6.5,
    avgAlignment: 7.2,
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>IdentityForge</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeTitle}>Welcome back</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalEntries}</Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.avgEnergy}</Text>
            <Text style={styles.statLabel}>Avg Energy</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.avgAlignment}</Text>
            <Text style={styles.statLabel}>Alignment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('ValuesDiscovery')}
        >
          <Text style={styles.actionIcon}>🎯</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Discover Values</Text>
            <Text style={styles.actionDesc}>Explore your core values</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('IdentityCraft')}
        >
          <Text style={styles.actionIcon}>✨</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Craft Identity</Text>
            <Text style={styles.actionDesc}>Define your extraordinary self</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('DailyEntry')}
        >
          <Text style={styles.actionIcon}>📝</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Daily Entry</Text>
            <Text style={styles.actionDesc}>Reflect on today</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Coach')}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>AI Coach</Text>
            <Text style={styles.actionDesc}>Get personalized guidance</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Values Discovery Screen
function ValuesDiscoveryScreen({ navigation }: { navigation: any }) {
  const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string }>>([
    { id: '1', role: 'assistant', content: "I'd love to help you discover your core values. Let's start simply: Tell me about a recent experience that felt meaningful to you. What made it feel that way?" },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: input };
    setMessages([...messages, userMsg]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "That's really insightful. Let's go deeper - what's underneath that feeling?",
        "Interesting. How do you hold both of those values when they conflict?",
        "What would it mean if you could always have that in your life?",
      ];
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.chatTitle}>Values Discovery</Text>
      </View>

      <ScrollView style={styles.chatMessages}>
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}
          >
            <Text style={msg.role === 'user' ? styles.userMessageText : styles.assistantMessageText}>
              {msg.content}
            </Text>
          </View>
        ))}
        {isLoading && (
          <View style={styles.assistantMessage}>
            <Text style={styles.assistantMessageText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.chatInput}>
        <TextInput
          style={styles.chatInputField}
          value={input}
          onChangeText={setInput}
          placeholder="Share your thoughts..."
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Daily Entry Screen
function DailyEntryScreen({ navigation }: { navigation: any }) {
  const [step, setStep] = useState<'energy' | 'morning' | 'values' | 'evening' | 'complete'>('energy');
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [alignmentScore, setAlignmentScore] = useState<number | null>(null);
  const [morningResponse, setMorningResponse] = useState('');
  const [eveningResponse, setEveningResponse] = useState('');

  const predefinedValues = [
    'Creativity', 'Growth', 'Connection', 'Freedom', 'Security',
    'Authenticity', 'Compassion', 'Courage', 'Curiosity', 'Peace',
  ];

  const toggleValue = (value: string) => {
    setSelectedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  // Energy Selection
  if (step === 'energy') {
    return (
      <View style={styles.entryContainer}>
        <View style={styles.entryHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.entryTitle}>Daily Entry</Text>
        </View>

        <View style={styles.entryContent}>
          <Text style={styles.entryQuestion}>How's your energy today?</Text>
          <View style={styles.energyGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.energyButton,
                  level <= 3 && styles.energyLow,
                  level > 3 && level <= 6 && styles.energyMedium,
                  level > 6 && styles.energyHigh,
                  energyLevel === level && styles.energySelected,
                ]}
                onPress={() => {
                  setEnergyLevel(level);
                  setStep('morning');
                }}
              >
                <Text style={styles.energyText}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // Morning Reflection
  if (step === 'morning') {
    return (
      <View style={styles.entryContainer}>
        <View style={styles.entryHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.entryTitle}>Morning Reflection</Text>
        </View>

        <View style={styles.entryContent}>
          <View style={styles.promptCard}>
            <Text style={styles.promptText}>
              {energyLevel && energyLevel <= 4
                ? "What's one small thing that would feel good today?"
                : "How do you want to show up today?"}
            </Text>
          </View>

          <TextInput
            style={styles.responseInput}
            value={morningResponse}
            onChangeText={setMorningResponse}
            placeholder="Write your thoughts..."
            multiline
            numberOfLines={6}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setStep('values')}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Values Selection
  if (step === 'values') {
    return (
      <View style={styles.entryContainer}>
        <View style={styles.entryHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.entryTitle}>Select Values</Text>
        </View>

        <View style={styles.entryContent}>
          <Text style={styles.entryQuestion}>Which values do you want to focus on?</Text>

          <View style={styles.valuesGrid}>
            {predefinedValues.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.valueChip,
                  selectedValues.includes(value) && styles.valueChipSelected,
                ]}
                onPress={() => toggleValue(value)}
              >
                <Text
                  style={[
                    styles.valueChipText,
                    selectedValues.includes(value) && styles.valueChipTextSelected,
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setStep('evening')}
          >
            <Text style={styles.primaryButtonText}>Continue to Evening</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Evening Reflection
  if (step === 'evening') {
    return (
      <View style={styles.entryContainer}>
        <View style={styles.entryHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.entryTitle}>Evening Reflection</Text>
        </View>

        <View style={styles.entryContent}>
          <View style={styles.promptCard}>
            <Text style={styles.promptText}>
              How did today move you toward who you want to be?
            </Text>
          </View>

          <TextInput
            style={styles.responseInput}
            value={eveningResponse}
            onChangeText={setEveningResponse}
            placeholder="Reflect on your day..."
            multiline
            numberOfLines={4}
          />

          <Text style={styles.entryQuestion}>How aligned did you feel?</Text>
          <View style={styles.energyGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <TouchableOpacity
                key={score}
                style={[
                  styles.energyButton,
                  alignmentScore === score && styles.energySelected,
                ]}
                onPress={() => setAlignmentScore(score)}
              >
                <Text style={styles.energyText}>{score}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setStep('complete')}
            disabled={alignmentScore === null}
          >
            <Text style={styles.primaryButtonText}>Complete Entry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Complete
  return (
    <View style={styles.entryContainer}>
      <View style={styles.entryContent}>
        <Text style={styles.completeIcon}>✨</Text>
        <Text style={styles.completeTitle}>Day Complete!</Text>
        <Text style={styles.completeText}>
          Great job reflecting today. Every entry brings you closer to understanding yourself.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.primaryButtonText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Identity Craft Screen (simplified)
function IdentityCraftScreen({ navigation }: { navigation: any }) {
  const [step, setStep] = useState(1);
  const [identityName, setIdentityName] = useState('');
  const [statement, setStatement] = useState('');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.chatTitle}>Craft Your Identity</Text>
      </View>

      <ScrollView style={styles.chatMessages}>
        {step === 1 && (
          <View style={styles.entryContent}>
            <Text style={styles.entryQuestion}>Name Your Identity</Text>
            <Text style={styles.stepDescription}>
              If you could be the best version of yourself, what would you call this person?
            </Text>
            <TextInput
              style={styles.responseInput}
              value={identityName}
              onChangeText={setIdentityName}
              placeholder="e.g., The Creative Explorer"
            />
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep(2)}
              disabled={!identityName.trim()}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.entryContent}>
            <Text style={styles.entryQuestion}>Craft Your Statement</Text>
            <Text style={styles.stepDescription}>
              Create a statement: "I am someone who..."
            </Text>
            <TextInput
              style={styles.responseInput}
              value={statement}
              onChangeText={setStatement}
              placeholder="I am someone who..."
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Dashboard')}
              disabled={!statement.trim()}
            >
              <Text style={styles.primaryButtonText}>Complete Identity</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Coach Screen (simplified chat)
function CoachScreen({ navigation }: { navigation: any }) {
  const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string }>>([
    { id: '1', role: 'assistant', content: "Hi! I'm here to support you. What's on your mind today?" },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: input };
    setMessages([...messages, userMsg]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I hear you. Let's explore that further. What does that mean to you?",
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.chatTitle}>AI Coach</Text>
      </View>

      <ScrollView style={styles.chatMessages}>
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}
          >
            <Text style={msg.role === 'user' ? styles.userMessageText : styles.assistantMessageText}>
              {msg.content}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.chatInput}>
        <TextInput
          style={styles.chatInputField}
          value={input}
          onChangeText={setInput}
          placeholder="What's on your mind?"
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Main App
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ValuesDiscovery" component={ValuesDiscoveryScreen} options={{ headerShown: false }} />
        <Stack.Screen name="IdentityCraft" component={IdentityCraftScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DailyEntry" component={DailyEntryScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Coach" component={CoachScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 8,
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchButtonText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  features: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  content: {
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionDesc: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  chatHeader: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    color: COLORS.primary,
    fontSize: 16,
    marginBottom: 8,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
  },
  userMessageText: {
    color: COLORS.white,
    fontSize: 16,
  },
  assistantMessageText: {
    color: COLORS.text,
    fontSize: 16,
  },
  chatInput: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatInputField: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  entryContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  entryHeader: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  entryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  entryContent: {
    flex: 1,
    padding: 20,
  },
  entryQuestion: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  stepDescription: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  energyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  energyButton: {
    width: 55,
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  energyLow: {
    backgroundColor: '#fed7d7',
  },
  energyMedium: {
    backgroundColor: '#feebc8',
  },
  energyHigh: {
    backgroundColor: '#c6f6d5',
  },
  energySelected: {
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  energyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  promptCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  promptText: {
    color: COLORS.white,
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  responseInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  valueChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  valueChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  valueChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  valueChipTextSelected: {
    color: COLORS.white,
  },
  completeIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  completeText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
});
