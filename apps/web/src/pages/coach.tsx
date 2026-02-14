import type { NextPage } from 'next';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const CoachPage: NextPage = () => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationType, setConversationType] = useState<string>('COACHING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check auth
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewConversation = async (type: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setConversationType(type);
    setErrorMessage(null);
    setMessages([]);
    setConversationId(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, title: `${type} Session` }),
      });

      if (!response.ok) {
        let error = 'Failed to start conversation.';
        try {
          const data = await response.json();
          if (typeof data.error === 'string' && data.error.trim().length > 0) {
            error = data.error;
          }
        } catch {
          // Keep default error message.
        }
        setErrorMessage(error);
        return;
      }

      const data = await response.json();
      setConversationId(data.conversation?.id ?? null);

      if (data.conversation?.messages?.length > 0) {
        setMessages(
          data.conversation.messages.map((m: any) => ({
            id: m.id,
            role: m.role === 'ASSISTANT' ? 'assistant' : 'user',
            content: m.content,
            timestamp: new Date(m.createdAt),
          }))
        );
      }
    } catch {
      setErrorMessage('Failed to start conversation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    if (!conversationId) {
      setErrorMessage('Select a conversation type to start.');
      return;
    }

    setErrorMessage(null);
    const content = inputValue;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage('You are signed out. Please sign in again.');
        return;
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        let error = 'Failed to get AI response.';
        try {
          const data = await response.json();
          if (typeof data.error === 'string' && data.error.trim().length > 0) {
            error = data.error;
          }
        } catch {
          // Keep default error message.
        }
        setErrorMessage(error);
        return;
      }

      const data = await response.json();

      // Get all assistant messages from the response
      const assistantMessages = (Array.isArray(data.messages) ? data.messages : [])
        .filter((m: any) => m.role === 'ASSISTANT')
        .map((m: any) => ({
          id: m.id,
          role: 'assistant' as const,
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));

      // Always update with the latest messages - filter for truly new ones
      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id));
        const freshMessages = assistantMessages.filter((message) => !existingIds.has(message.id));

        // If we have new messages, add them
        if (freshMessages.length > 0) {
          return [...prev, ...freshMessages];
        }

        // If no new messages but we got a valid response, it means messages were already added
        // This can happen due to race conditions - don't show an error
        return prev;
      });

      // Only show error if the API literally returned no messages at all
      if (!Array.isArray(data.messages) || data.messages.length === 0) {
        setErrorMessage('The AI returned no message.');
      }
    } catch {
      setErrorMessage('Failed to get AI response.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/dashboard" style={styles.backLink}>← Back to Dashboard</Link>
        <h1 style={styles.headerTitle}>AI Coach</h1>
      </header>

      <main style={styles.main}>
        {/* Conversation Type Selector */}
        <div style={styles.typeSelector}>
          <button
            onClick={() => startNewConversation('COACHING')}
            style={conversationType === 'COACHING' ? styles.typeButtonActive : styles.typeButton}
          >
            General
          </button>
          <button
            onClick={() => startNewConversation('VALUES_DISCOVERY')}
            style={conversationType === 'VALUES_DISCOVERY' ? styles.typeButtonActive : styles.typeButton}
          >
            Values
          </button>
          <button
            onClick={() => startNewConversation('IDENTITY_CRAFT')}
            style={conversationType === 'IDENTITY_CRAFT' ? styles.typeButtonActive : styles.typeButton}
          >
            Identity
          </button>
          <button
            onClick={() => startNewConversation('BELIEF_WORK')}
            style={conversationType === 'BELIEF_WORK' ? styles.typeButtonActive : styles.typeButton}
          >
            Beliefs
          </button>
          <button
            onClick={() => startNewConversation('DAILY_REFLECTION')}
            style={conversationType === 'DAILY_REFLECTION' ? styles.typeButtonActive : styles.typeButton}
          >
            Reflection
          </button>
        </div>

        {/* Messages */}
        <div style={styles.messagesContainer}>
          {errorMessage && <div style={styles.errorBanner}>{errorMessage}</div>}
          {messages.length === 0 && (
            <div style={styles.emptyState}>
              <p>Select a conversation type above to begin.</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                ...styles.messageBubble,
                ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage),
              }}
            >
              <div style={styles.messageContent}>{message.content}</div>
            </div>
          ))}
          {isLoading && (
            <div style={styles.loadingMessage}>
              <span style={styles.loadingDots}>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} style={styles.inputContainer}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={conversationId ? 'Type your message...' : 'Start a conversation first'}
            style={styles.input}
            disabled={isLoading || !conversationId}
          />
          <button
            type="submit"
            style={{
              ...styles.sendButton,
              ...(isLoading ? styles.sendButtonDisabled : {}),
            }}
            disabled={isLoading || !conversationId}
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#f8f9fa',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'white',
    borderBottom: '1px solid #e9ecef',
    padding: '16px 24px',
  },
  backLink: {
    display: 'inline-block',
    fontSize: '14px',
    color: '#667eea',
    textDecoration: 'none',
    marginBottom: '8px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  typeSelector: {
    display: 'flex',
    gap: '8px',
    padding: '16px',
    background: 'white',
    borderBottom: '1px solid #e9ecef',
    overflowX: 'auto',
  },
  typeButton: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #ddd',
    background: 'white',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  typeButtonActive: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #667eea',
    background: '#667eea',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    padding: '40px',
  },
  errorBanner: {
    background: '#ffe3e3',
    border: '1px solid #ffb3b3',
    color: '#8a1f1f',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '8px',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: '16px 20px',
    borderRadius: '16px',
  },
  userMessage: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    background: 'white',
    color: '#333',
    borderBottomLeftRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  messageContent: {
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
  },
  loadingMessage: {
    padding: '16px 20px',
    background: 'white',
    borderRadius: '16px',
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  loadingDots: {
    color: '#999',
  },
  inputContainer: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    background: 'white',
    borderTop: '1px solid #e9ecef',
  },
  input: {
    flex: 1,
    padding: '14px 20px',
    borderRadius: '24px',
    border: '1px solid #ddd',
    fontSize: '16px',
    outline: 'none',
  },
  sendButton: {
    padding: '14px 28px',
    borderRadius: '24px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  sendButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

export default CoachPage;
