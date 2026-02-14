import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

interface Value {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  whyDeepDive: string | null;
  connectionToIdentity: string | null;
}

// Helper to extract value name from belief statement
function extractValueName(statement: string): string {
  // Try to extract from "X is important to me" pattern
  const match = statement.match(/^(.+?)\s+(?:is|are)\s+important/i);
  if (match) return match[1].trim();

  // Try to extract from statement about importance/meaning
  const words = statement.split(' ');
  if (words.length <= 3) return statement;

  // Default to first few words
  return words.slice(0, 2).join(' ');
}

const ValuesPage: NextPage = () => {
  const router = useRouter();
  const [values, setValues] = useState<Value[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingValue, setEditingValue] = useState<Value | null>(null);
  const [newValueName, setNewValueName] = useState('');

  useEffect(() => {
    async function fetchValues() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }

        // NEW: Use Beliefs API
        const response = await fetch('/api/beliefs?type=VALUE', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const result = await response.json();
          // Map beliefs to Value interface for existing UI
          const mappedValues = (result.beliefs || []).map((belief: any) => ({
            id: belief.id,
            name: extractValueName(belief.statement),
            description: belief.statement,
            priority: belief.priority || 0,
            whyDeepDive: belief.origin,
            connectionToIdentity: belief.evidence,
          }));
          setValues(mappedValues);
        }
      } catch (error) {
        console.error('Error fetching values:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchValues();
  }, [router]);

  const handleAddValue = async () => {
    if (!newValueName.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use Beliefs API
      const response = await fetch('/api/beliefs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'VALUE',
          statement: `${newValueName.trim()} is important to me`,
          priority: values.length + 1,
          strength: 0.7,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const newValue = {
          id: result.belief.id,
          name: extractValueName(result.belief.statement),
          description: result.belief.statement,
          priority: result.belief.priority || 0,
          whyDeepDive: result.belief.origin,
          connectionToIdentity: result.belief.evidence,
        };
        setValues([...values, newValue]);
        setNewValueName('');
      }
    } catch (error) {
      console.error('Error adding value:', error);
    }
  };

  const handleDeleteValue = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use Beliefs API
      const response = await fetch(`/api/beliefs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        setValues(values.filter((v) => v.id !== id));
      }
    } catch (error) {
      console.error('Error deleting value:', error);
    }
  };

  const handleUpdatePriority = async (id: string, newPriority: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use Beliefs API
      const response = await fetch(`/api/beliefs/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (response.ok) {
        setValues(values.map((v) => v.id === id ? { ...v, priority: newPriority } : v));
      }
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/dashboard" style={styles.backLink}>← Back to Dashboard</Link>
        <h1 style={styles.headerTitle}>Your Values</h1>
        <p style={styles.headerSubtitle}>Core values that guide your life</p>
      </header>

      <main style={styles.main}>
        {/* Add New Value */}
        <div style={styles.addSection}>
          <input
            type="text"
            value={newValueName}
            onChange={(e) => setNewValueName(e.target.value)}
            placeholder="Add a new value..."
            style={styles.addInput}
            onKeyDown={(e) => e.key === 'Enter' && handleAddValue()}
          />
          <button onClick={handleAddValue} style={styles.addButton}>Add</button>
        </div>

        {/* Values List */}
        {values.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🎯</div>
            <h3 style={styles.emptyTitle}>No values yet</h3>
            <p style={styles.emptyText}>
              Start by discovering your core values through conversation with our AI.
            </p>
            <Link href="/values-discovery" style={styles.startButton}>
              Discover Values
            </Link>
          </div>
        ) : (
          <div style={styles.valuesList}>
            {values.map((value, index) => (
              <div key={value.id} style={styles.valueCard}>
                <div style={styles.valueRank}>
                  #{index + 1}
                </div>
                <div style={styles.valueContent}>
                  <h3 style={styles.valueName}>{value.name}</h3>
                  {value.description && (
                    <p style={styles.valueDescription}>{value.description}</p>
                  )}
                  {value.whyDeepDive && (
                    <div style={styles.valueDepth}>
                      <strong>Why:</strong> {value.whyDeepDive}
                    </div>
                  )}
                  {value.connectionToIdentity && (
                    <div style={styles.valueConnection}>
                      <strong>Identity:</strong> {value.connectionToIdentity}
                    </div>
                  )}
                </div>
                <div style={styles.valueActions}>
                  <button
                    onClick={() => handleUpdatePriority(value.id, Math.max(1, value.priority - 1))}
                    disabled={index === 0}
                    style={styles.upButton}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleUpdatePriority(value.id, value.priority + 1)}
                    disabled={index === values.length - 1}
                    style={styles.downButton}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleDeleteValue(value.id)}
                    style={styles.deleteButton}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <Link href="/values-discovery" style={styles.actionLink}>
            Continue Values Discovery →
          </Link>
        </div>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#f8f9fa',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#666',
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
  headerSubtitle: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  addSection: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  addInput: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
  },
  addButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: '#667eea',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyState: {
    background: 'white',
    borderRadius: '12px',
    padding: '48px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '16px',
    color: '#666',
    margin: '0 0 24px 0',
  },
  startButton: {
    display: 'inline-block',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    textDecoration: 'none',
  },
  valuesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  valueCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  valueRank: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#667eea',
    minWidth: '40px',
  },
  valueContent: {
    flex: 1,
  },
  valueName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
  },
  valueDescription: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  valueDepth: {
    fontSize: '14px',
    color: '#666',
    marginTop: '8px',
    padding: '8px 12px',
    background: '#f8f9fa',
    borderRadius: '6px',
  },
  valueConnection: {
    fontSize: '14px',
    color: '#666',
    marginTop: '8px',
    padding: '8px 12px',
    background: '#f0f0ff',
    borderRadius: '6px',
  },
  valueActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  upButton: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    background: 'white',
    cursor: 'pointer',
  },
  downButton: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    background: 'white',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #fed7d7',
    background: 'white',
    color: '#c53030',
    cursor: 'pointer',
    fontSize: '16px',
  },
  quickActions: {
    marginTop: '24px',
    textAlign: 'center',
  },
  actionLink: {
    fontSize: '14px',
    color: '#667eea',
    textDecoration: 'none',
  },
};

export default ValuesPage;
