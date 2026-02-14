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

interface ApiConversationMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

const ValuesDiscovery: NextPage = () => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function startConversation() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setMessages([]);
      setConversationId(null);

      try {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'VALUES_DISCOVERY',
            title: 'Values Discovery Session',
          }),
        });

        if (!response.ok) {
          let error = 'Failed to start values discovery.';
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

        if (Array.isArray(data.conversation?.messages)) {
          setMessages(
            data.conversation.messages.map((message: ApiConversationMessage) => ({
              id: message.id,
              role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
              content: message.content,
              timestamp: new Date(message.createdAt),
            }))
          );
        }
      } catch {
        setErrorMessage('Failed to start values discovery.');
      } finally {
        setIsLoading(false);
      }
    }

    startConversation();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    if (!conversationId) {
      setErrorMessage('Conversation is not ready yet.');
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage('You are signed out. Please sign in again.');
        return;
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
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
        .filter((message: ApiConversationMessage) => message.role === 'ASSISTANT')
        .map((message: ApiConversationMessage) => ({
          id: message.id,
          role: 'assistant' as const,
          content: message.content,
          timestamp: new Date(message.createdAt),
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

  const handleComplete = () => setIsComplete(true);

  if (isComplete) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/dashboard" style={styles.backLink}>
            {'<- Back to Dashboard'}
          </Link>
        </header>
        <main style={styles.main}>
          <div style={styles.completeCard}>
            <h2 style={styles.completeTitle}>Values Discovery Complete</h2>
            <p style={styles.completeText}>Session complete. Review your conversation and continue refining your values in dashboard tools.</p>
            <Link href="/dashboard" style={styles.primaryButton}>
              Go to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/dashboard" style={styles.backLink}>
          {'<- Back to Dashboard'}
        </Link>
        <h1 style={styles.title}>Values Discovery</h1>
        <p style={styles.subtitle}>Explore what truly matters to you</p>
      </header>
      <main style={styles.chatContainer}>
        <div style={styles.messagesContainer}>
          {errorMessage && <div style={styles.errorBanner}>{errorMessage}</div>}
          {messages.length === 0 && !isLoading && (
            <div style={styles.emptyState}>Starting values discovery...</div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                ...styles.message,
                ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage),
              }}
            >
              <div style={styles.messageContent}>{message.content}</div>
            </div>
          ))}
          {isLoading && <div style={styles.loadingMessage}>Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} style={styles.inputContainer}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={conversationId ? 'Share your thoughts...' : 'Conversation is loading...'}
            style={styles.input}
            disabled={isLoading || !conversationId}
          />
          <button type="submit" style={styles.sendButton} disabled={isLoading || !conversationId}>
            Send
          </button>
        </form>
        <div style={styles.footerActions}>
          <button onClick={handleComplete} style={styles.finishButton} disabled={isLoading || messages.length === 0}>
            Mark Discovery Complete
          </button>
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#f8f9fa' },
  header: {
    background: 'white',
    borderBottom: '1px solid #e9ecef',
    padding: '16px 24px',
    textAlign: 'center',
  },
  backLink: {
    display: 'inline-block',
    fontSize: '14px',
    color: '#667eea',
    textDecoration: 'none',
    marginBottom: '8px',
  },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0 },
  subtitle: { fontSize: '14px', color: '#666', marginTop: '4px' },
  chatContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 140px)',
  },
  messagesContainer: { flex: 1, overflowY: 'auto', padding: '16px 0' },
  errorBanner: {
    background: '#ffe3e3',
    border: '1px solid #ffb3b3',
    color: '#8a1f1f',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '12px',
  },
  emptyState: { textAlign: 'center', color: '#999', padding: '16px' },
  message: {
    maxWidth: '80%',
    padding: '16px 20px',
    borderRadius: '16px',
    marginBottom: '16px',
    lineHeight: 1.6,
  },
  userMessage: {
    marginLeft: 'auto',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  assistantMessage: {
    marginRight: 'auto',
    background: 'white',
    color: '#333',
    borderBottomLeftRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  messageContent: { whiteSpace: 'pre-wrap' },
  loadingMessage: { padding: '16px', color: '#666', fontStyle: 'italic' },
  inputContainer: { display: 'flex', gap: '12px', padding: '16px 0' },
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
  footerActions: { textAlign: 'center', paddingTop: '16px' },
  finishButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: 'white',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
  },
  main: { maxWidth: '600px', margin: '0 auto', padding: '48px 24px' },
  completeCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  completeTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 12px 0',
  },
  completeText: { fontSize: '16px', color: '#666', marginBottom: '24px' },
  primaryButton: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    textDecoration: 'none',
  },
};

export default ValuesDiscovery;
