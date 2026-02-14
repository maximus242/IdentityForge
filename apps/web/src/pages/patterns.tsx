import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

interface Pattern {
  type: string;
  description: string;
  confidence: number;
}

interface PatternData {
  summary: string;
  patterns: Pattern[];
  recommendations: string[];
  dataPoints?: number;
}

const PatternsPage: NextPage = () => {
  const router = useRouter();
  const [data, setData] = useState<PatternData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatterns() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }

        const response = await fetch('/api/patterns', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching patterns:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPatterns();
  }, [router]);

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'TEMPORAL': return '#667eea';
      case 'BEHAVIORAL': return '#764ba2';
      case 'EMOTIONAL': return '#ed8936';
      case 'VALUES': return '#48bb78';
      case 'IDENTITY': return '#ed64a6';
      default: return '#666';
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'TEMPORAL': return 'Time Patterns';
      case 'BEHAVIORAL': return 'Behavior Patterns';
      case 'EMOTIONAL': return 'Emotional Patterns';
      case 'VALUES': return 'Values Patterns';
      case 'IDENTITY': return 'Identity Patterns';
      default: return type;
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
        <h1 style={styles.headerTitle}>Pattern Insights</h1>
        <p style={styles.headerSubtitle}>Discover patterns in your journey</p>
      </header>

      <main style={styles.main}>
        {/* Summary */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Weekly Summary</h2>
          <div style={styles.summaryCard}>
            <p style={styles.summaryText}>{data?.summary || 'Not enough data yet.'}</p>
            {data?.dataPoints && (
              <p style={styles.dataPoints}>Based on {data.dataPoints} entries</p>
            )}
          </div>
        </section>

        {/* Patterns */}
        {data?.patterns && data.patterns.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Discovered Patterns</h2>
            <div style={styles.patternsList}>
              {data.patterns.map((pattern, index) => (
                <div key={index} style={styles.patternCard}>
                  <div style={styles.patternHeader}>
                    <span
                      style={{
                        ...styles.patternType,
                        backgroundColor: getTypeColor(pattern.type),
                      }}
                    >
                      {getTypeLabel(pattern.type)}
                    </span>
                    <span style={styles.patternConfidence}>
                      {Math.round(pattern.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p style={styles.patternDescription}>{pattern.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {data?.recommendations && data.recommendations.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Recommendations</h2>
            <div style={styles.recommendationsList}>
              {data.recommendations.map((rec, index) => (
                <div key={index} style={styles.recommendationItem}>
                  <span style={styles.recommendationIcon}>💡</span>
                  <span style={styles.recommendationText}>{rec}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {(!data?.patterns || data.patterns.length === 0) && (
          <section style={styles.section}>
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <h3 style={styles.emptyTitle}>Keep Tracking!</h3>
              <p style={styles.emptyText}>
                Pattern recognition needs more data. Continue logging your daily entries to discover insights about your values, energy, and alignment.
              </p>
              <Link href="/daily-entry" style={styles.startButton}>
                Log Entry
              </Link>
            </div>
          </section>
        )}
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
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
  },
  summaryCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    padding: '24px',
    color: 'white',
  },
  summaryText: {
    fontSize: '16px',
    margin: 0,
    lineHeight: 1.6,
  },
  dataPoints: {
    fontSize: '12px',
    opacity: 0.8,
    marginTop: '12px',
  },
  patternsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  patternCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  patternHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  patternType: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
  },
  patternConfidence: {
    fontSize: '12px',
    color: '#999',
  },
  patternDescription: {
    fontSize: '14px',
    color: '#333',
    margin: 0,
    lineHeight: 1.6,
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recommendationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  recommendationIcon: {
    fontSize: '20px',
  },
  recommendationText: {
    fontSize: '14px',
    color: '#333',
    flex: 1,
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
    lineHeight: 1.6,
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
};

export default PatternsPage;
