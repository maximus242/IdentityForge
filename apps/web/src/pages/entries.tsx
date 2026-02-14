import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

interface DailyEntry {
  id: string;
  date: string;
  energyLevel: number | null;
  alignmentScore: number | null;
  morningResponse: string | null;
  eveningResponse: string | null;
  aiReflection: string | null;
}

const EntriesPage: NextPage = () => {
  const router = useRouter();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }

        const response = await fetch('/api/entries?limit=30', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setEntries(result.entries || []);
        }
      } catch (error) {
        console.error('Error fetching entries:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, [router]);

  const getEnergyColor = (level: number | null): string => {
    if (!level) return '#999';
    if (level <= 3) return '#c53030';
    if (level <= 6) return '#c05621';
    return '#276749';
  };

  const getAlignmentColor = (score: number | null): string => {
    if (!score) return '#999';
    if (score <= 3) return '#c53030';
    if (score <= 6) return '#c05621';
    return '#276749';
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
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
        <h1 style={styles.headerTitle}>Daily Entries</h1>
        <p style={styles.headerSubtitle}>Your reflection history</p>
      </header>

      <main style={styles.main}>
        {entries.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📝</div>
            <h3 style={styles.emptyTitle}>No entries yet</h3>
            <p style={styles.emptyText}>
              Start your first daily entry to track your journey.
            </p>
            <Link href="/daily-entry" style={styles.startButton}>
              Create Entry
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{entries.length}</span>
                <span style={styles.statLabel}>Total Entries</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>
                  {Math.round(entries.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / entries.length) || 0}
                </span>
                <span style={styles.statLabel}>Avg Energy</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>
                  {Math.round(entries.reduce((sum, e) => sum + (e.alignmentScore || 0), 0) / entries.length) || 0}
                </span>
                <span style={styles.statLabel}>Avg Alignment</span>
              </div>
            </div>

            {/* Entries List */}
            <div style={styles.entriesList}>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  style={styles.entryCard}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div style={styles.entryDate}>{formatDate(entry.date)}</div>
                  <div style={styles.entryStats}>
                    <div style={styles.entryStat}>
                      <span style={styles.entryStatLabel}>Energy:</span>
                      <span style={{
                        ...styles.entryStatValue,
                        color: getEnergyColor(entry.energyLevel),
                      }}>
                        {entry.energyLevel || '-'}
                      </span>
                    </div>
                    <div style={styles.entryStat}>
                      <span style={styles.entryStatLabel}>Alignment:</span>
                      <span style={{
                        ...styles.entryStatValue,
                        color: getAlignmentColor(entry.alignmentScore),
                      }}>
                        {entry.alignmentScore || '-'}
                      </span>
                    </div>
                  </div>
                  {entry.morningResponse && (
                    <div style={styles.entryPreview}>
                      {entry.morningResponse.substring(0, 100)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* New Entry Button */}
        <div style={styles.newEntrySection}>
          <Link href="/daily-entry" style={styles.newEntryButton}>
            + New Entry
          </Link>
        </div>
      </main>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div style={styles.modalOverlay} onClick={() => setSelectedEntry(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{formatDate(selectedEntry.date)}</h2>
              <button
                style={styles.closeButton}
                onClick={() => setSelectedEntry(null)}
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Stats */}
              <div style={styles.modalStats}>
                <div style={styles.modalStatItem}>
                  <span style={styles.modalStatLabel}>Energy Level</span>
                  <span style={{
                    ...styles.modalStatValue,
                    color: getEnergyColor(selectedEntry.energyLevel),
                  }}>
                    {selectedEntry.energyLevel || '-'}/10
                  </span>
                </div>
                <div style={styles.modalStatItem}>
                  <span style={styles.modalStatLabel}>Alignment Score</span>
                  <span style={{
                    ...styles.modalStatValue,
                    color: getAlignmentColor(selectedEntry.alignmentScore),
                  }}>
                    {selectedEntry.alignmentScore || '-'}/10
                  </span>
                </div>
              </div>

              {/* Morning Response */}
              {selectedEntry.morningResponse && (
                <div style={styles.responseSection}>
                  <h4 style={styles.responseTitle}>Morning Reflection</h4>
                  <p style={styles.responseText}>{selectedEntry.morningResponse}</p>
                </div>
              )}

              {/* Evening Response */}
              {selectedEntry.eveningResponse && (
                <div style={styles.responseSection}>
                  <h4 style={styles.responseTitle}>Evening Reflection</h4>
                  <p style={styles.responseText}>{selectedEntry.eveningResponse}</p>
                </div>
              )}

              {/* AI Reflection */}
              {selectedEntry.aiReflection && (
                <div style={styles.responseSection}>
                  <h4 style={styles.responseTitle}>AI Reflection</h4>
                  <p style={styles.aiReflection}>{selectedEntry.aiReflection}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  statItem: {
    flex: 1,
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },
  entriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  entryCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  entryDate: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  entryStats: {
    display: 'flex',
    gap: '24px',
    marginBottom: '8px',
  },
  entryStat: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
  },
  entryStatLabel: {
    color: '#666',
  },
  entryStatValue: {
    fontWeight: '600',
  },
  entryPreview: {
    fontSize: '14px',
    color: '#999',
    fontStyle: 'italic',
  },
  newEntrySection: {
    marginTop: '24px',
    textAlign: 'center',
  },
  newEntryButton: {
    display: 'inline-block',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    textDecoration: 'none',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
  },
  modalBody: {},
  modalStats: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  modalStatItem: {
    flex: 1,
    textAlign: 'center',
  },
  modalStatLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
  },
  modalStatValue: {
    fontSize: '24px',
    fontWeight: 'bold',
  },
  responseSection: {
    marginBottom: '20px',
  },
  responseTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#667eea',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  responseText: {
    fontSize: '16px',
    color: '#333',
    lineHeight: 1.6,
    margin: 0,
  },
  aiReflection: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 1.6,
    margin: 0,
    padding: '12px',
    background: '#f0f0ff',
    borderRadius: '8px',
  },
};

export default EntriesPage;
