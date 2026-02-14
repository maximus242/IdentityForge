import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

// Helper to extract name from identity statement
function extractName(statement: string): string {
  // Try to extract from "I am [name]" pattern
  const match = statement.match(/^I am (?:a |an |the )?(.+?)(?:\.|$)/i);
  if (match) return match[1].trim();

  // Try to extract from "I am someone who..." pattern
  const someoneMatch = statement.match(/^I am someone who (.+?)(?:\.|$)/i);
  if (someoneMatch) {
    const words = someoneMatch[1].split(' ');
    return words.slice(0, 3).join(' ');
  }

  // Default to first few words
  const words = statement.split(' ');
  return words.slice(0, 3).join(' ');
}

const IdentityPage: NextPage = () => {
  const router = useRouter();
  const [identityStatement, setIdentityStatement] = useState<string>('');
  const [archetype, setArchetype] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function fetchIdentity() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }

        // NEW: Use Beliefs API
        const response = await fetch('/api/beliefs?type=IDENTITY_CORE,IDENTITY_BEHAVIOR,IDENTITY_TRAIT,IDENTITY_EMBODIMENT', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const result = await response.json();
          const beliefs = result.beliefs || [];

          // Find active core belief (parent)
          const coreBeliefs = beliefs.filter((b: any) => b.type === 'IDENTITY_CORE' && !b.parentBeliefId);
          const activeCore = coreBeliefs.find((b: any) => b.isActive);

          if (activeCore) {
            // Reconstruct archetype from beliefs
            const childBeliefs = beliefs.filter((b: any) => b.parentBeliefId === activeCore.id);

            const reconstructedArchetype = {
              name: extractName(activeCore.statement),
              description: activeCore.statement,
              beliefs: childBeliefs.filter((b: any) => b.type === 'IDENTITY_CORE').map((b: any) => b.statement),
              behaviors: childBeliefs.filter((b: any) => b.type === 'IDENTITY_BEHAVIOR').map((b: any) => b.statement),
              traits: childBeliefs.filter((b: any) => b.type === 'IDENTITY_TRAIT').map((b: any) => b.statement),
              embodiedPractice: childBeliefs.find((b: any) => b.type === 'IDENTITY_EMBODIMENT')?.statement,
            };

            setArchetype(reconstructedArchetype);
            setIdentityStatement(activeCore.statement);
          }
        }
      } catch (error) {
        console.error('Error fetching identity:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchIdentity();
  }, [router]);

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/identity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identityStatement }),
      });

      if (response.ok) {
        setEditing(false);
      }
    } catch (error) {
      console.error('Error saving identity:', error);
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
        <h1 style={styles.headerTitle}>Your Identity</h1>
        <p style={styles.headerSubtitle}>Who you want to become</p>
      </header>

      <main style={styles.main}>
        {/* Identity Statement */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Identity Statement</h2>
            {!editing && (
              <button onClick={() => setEditing(true)} style={styles.editButton}>
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div style={styles.editForm}>
              <textarea
                value={identityStatement}
                onChange={(e) => setIdentityStatement(e.target.value)}
                placeholder="I am someone who..."
                style={styles.textarea}
                rows={4}
              />
              <div style={styles.editActions}>
                <button onClick={() => setEditing(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button onClick={handleSave} style={styles.saveButton}>
                  Save
                </button>
              </div>
            </div>
          ) : identityStatement ? (
            <div style={styles.statementCard}>
              <p style={styles.statementText}>"{identityStatement}"</p>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p>No identity statement yet.</p>
              <button onClick={() => setEditing(true)} style={styles.createButton}>
                Create Identity Statement
              </button>
            </div>
          )}
        </section>

        {/* Identity Archetype */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Your Archetype</h2>
          {archetype ? (
            <div style={styles.archetypeCard}>
              <h3 style={styles.archetypeName}>{archetype.name}</h3>
              {archetype.description && (
                <p style={styles.archetypeDesc}>{archetype.description}</p>
              )}

              {archetype.beliefs && archetype.beliefs.length > 0 && (
                <div style={styles.archetypeSection}>
                  <h4 style={styles.archetypeSectionTitle}>Beliefs</h4>
                  <ul style={styles.archetypeList}>
                    {archetype.beliefs.map((b: string, i: number) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {archetype.behaviors && archetype.behaviors.length > 0 && (
                <div style={styles.archetypeSection}>
                  <h4 style={styles.archetypeSectionTitle}>Behaviors</h4>
                  <ul style={styles.archetypeList}>
                    {archetype.behaviors.map((b: string, i: number) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {archetype.traits && archetype.traits.length > 0 && (
                <div style={styles.archetypeSection}>
                  <h4 style={styles.archetypeSectionTitle}>Traits</h4>
                  <div style={styles.traitsList}>
                    {archetype.traits.map((t: string, i: number) => (
                      <span key={i} style={styles.traitChip}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {archetype.embodiedPractice && (
                <div style={styles.archetypeSection}>
                  <h4 style={styles.archetypeSectionTitle}>Embodiment</h4>
                  <p style={styles.embodimentText}>{archetype.embodiedPractice}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p>No archetype defined yet.</p>
              <Link href="/identity-craft" style={styles.createButton}>
                Craft Your Identity
              </Link>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <Link href="/identity-craft" style={styles.actionLink}>
            {archetype ? 'Update Identity' : 'Create Identity'} →
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
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
  },
  editButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    background: 'white',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
  },
  editForm: {},
  textarea: {
    width: '100%',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  editActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    background: 'white',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    background: '#667eea',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statementCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    padding: '24px',
    color: 'white',
  },
  statementText: {
    fontSize: '20px',
    fontStyle: 'italic',
    margin: 0,
    lineHeight: 1.6,
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px',
    color: '#666',
  },
  createButton: {
    display: 'inline-block',
    marginTop: '12px',
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '6px',
    textDecoration: 'none',
  },
  archetypeCard: {},
  archetypeName: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0 0 12px 0',
  },
  archetypeDesc: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '20px',
  },
  archetypeSection: {
    marginBottom: '16px',
  },
  archetypeSectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  archetypeList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#333',
    lineHeight: 1.8,
  },
  traitsList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  traitChip: {
    padding: '6px 12px',
    background: '#f0f0ff',
    borderRadius: '16px',
    fontSize: '14px',
    color: '#667eea',
  },
  embodimentText: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
    margin: 0,
  },
  quickActions: {
    textAlign: 'center',
  },
  actionLink: {
    fontSize: '14px',
    color: '#667eea',
    textDecoration: 'none',
  },
};

export default IdentityPage;
