import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

interface Belief {
  id: string;
  type: string;
  statement: string;
  category?: string;
  origin?: string;
  evidence?: string;
  counterEvidence?: string;
  challenge?: string;
  strength: number;
  priority?: number;
  isEmpowering: boolean;
  createdAt: string;
}

type FilterType = 'all' | 'empowering' | 'limiting';
type ExportFormat = 'json' | 'csv';

const BeliefsPage: NextPage = () => {
  const router = useRouter();
  const [beliefs, setBeliefs] = useState<Belief[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchBeliefs() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }

        const response = await fetch('/api/beliefs', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setBeliefs(result.beliefs || []);
        }
      } catch (error) {
        console.error('Error fetching beliefs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBeliefs();
  }, [router]);

  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch(`/api/beliefs/export?format=${format}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beliefs-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting beliefs:', error);
      alert('Failed to export beliefs. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const formatBeliefType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const filteredBeliefs = beliefs.filter(b => {
    if (filter === 'empowering') return b.isEmpowering;
    if (filter === 'limiting') return !b.isEmpowering;
    return true;
  });

  // Group beliefs by type
  const groupedByType = filteredBeliefs.reduce((acc, belief) => {
    if (!acc[belief.type]) acc[belief.type] = [];
    acc[belief.type].push(belief);
    return acc;
  }, {} as Record<string, Belief[]>);

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
        <h1 style={styles.headerTitle}>All Beliefs</h1>
        <p style={styles.headerSubtitle}>Your complete belief system</p>
      </header>

      <main style={styles.main}>
        {/* Filters and Export */}
        <div style={styles.topControls}>
          <div style={styles.filters}>
            <button
              onClick={() => setFilter('all')}
              style={filter === 'all' ? styles.filterButtonActive : styles.filterButton}
            >
              All Beliefs ({beliefs.length})
            </button>
            <button
              onClick={() => setFilter('empowering')}
              style={filter === 'empowering' ? styles.filterButtonActive : styles.filterButton}
            >
              Empowering ({beliefs.filter(b => b.isEmpowering).length})
            </button>
            <button
              onClick={() => setFilter('limiting')}
              style={filter === 'limiting' ? styles.filterButtonActive : styles.filterButton}
            >
              Limiting ({beliefs.filter(b => !b.isEmpowering).length})
            </button>
          </div>
          <div style={styles.exportControls}>
            <button
              onClick={() => handleExport('json')}
              style={styles.exportButton}
              disabled={exporting}
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              style={styles.exportButton}
              disabled={exporting}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Beliefs Grouped by Type */}
        {Object.entries(groupedByType).length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💭</div>
            <h3 style={styles.emptyTitle}>No beliefs yet</h3>
            <p style={styles.emptyText}>
              Start exploring your beliefs through conversations with our AI.
            </p>
          </div>
        ) : (
          Object.entries(groupedByType).map(([type, typedBeliefs]) => (
            <section key={type} style={styles.section}>
              <h2 style={styles.sectionTitle}>
                {formatBeliefType(type)} ({typedBeliefs.length})
              </h2>
              <div style={styles.beliefsList}>
                {typedBeliefs.map(belief => (
                  <BeliefCard key={belief.id} belief={belief} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
};

interface BeliefCardProps {
  belief: Belief;
}

const BeliefCard: React.FC<BeliefCardProps> = ({ belief }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        ...styles.card,
        borderLeft: belief.isEmpowering
          ? '4px solid #48bb78'
          : '4px solid #f56565',
      }}
    >
      <div style={styles.cardHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.statement}>{belief.statement}</div>
        <button style={styles.expandButton}>
          {expanded ? '−' : '+'}
        </button>
      </div>

      <div style={styles.meta}>
        <span style={styles.strengthBadge}>
          Strength: {(belief.strength * 100).toFixed(0)}%
        </span>
        {belief.category && (
          <span style={styles.categoryBadge}>{belief.category}</span>
        )}
        {belief.priority && (
          <span style={styles.priorityBadge}>Priority: {belief.priority}</span>
        )}
      </div>

      {expanded && (
        <div style={styles.details}>
          {belief.origin && (
            <div style={styles.detailSection}>
              <strong style={styles.detailLabel}>Origin:</strong>
              <p style={styles.detailText}>{belief.origin}</p>
            </div>
          )}
          {belief.evidence && (
            <div style={styles.detailSection}>
              <strong style={styles.detailLabel}>Evidence:</strong>
              <p style={styles.detailText}>{belief.evidence}</p>
            </div>
          )}
          {belief.counterEvidence && (
            <div style={styles.detailSection}>
              <strong style={styles.detailLabel}>Counter-Evidence:</strong>
              <p style={styles.detailText}>{belief.counterEvidence}</p>
            </div>
          )}
          {belief.challenge && (
            <div style={styles.detailSection}>
              <strong style={styles.detailLabel}>Alternative:</strong>
              <p style={styles.challengeText}>{belief.challenge}</p>
            </div>
          )}
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
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
  },
  topControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '16px',
    marginBottom: '24px',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  exportControls: {
    display: 'flex',
    gap: '8px',
  },
  filterButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: 'white',
    color: '#666',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #667eea',
    background: '#667eea',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  exportButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #667eea',
    background: 'white',
    color: '#667eea',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      background: '#f0f4ff',
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
  },
  beliefsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '12px',
  },
  statement: {
    flex: 1,
    fontSize: '16px',
    color: '#333',
    lineHeight: 1.5,
  },
  expandButton: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '1px solid #ddd',
    background: 'white',
    color: '#666',
    fontSize: '18px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  meta: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  strengthBadge: {
    padding: '4px 12px',
    background: '#e6f7ff',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#1890ff',
    fontWeight: '500',
  },
  categoryBadge: {
    padding: '4px 12px',
    background: '#f0f0ff',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#667eea',
    fontWeight: '500',
  },
  priorityBadge: {
    padding: '4px 12px',
    background: '#fff7e6',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fa8c16',
    fontWeight: '500',
  },
  details: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
  },
  detailSection: {
    marginBottom: '12px',
  },
  detailLabel: {
    fontSize: '12px',
    color: '#999',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '4px',
  },
  detailText: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
  },
  challengeText: {
    fontSize: '14px',
    color: '#48bb78',
    margin: 0,
    lineHeight: 1.5,
    fontWeight: '500',
  },
  emptyState: {
    background: 'white',
    borderRadius: '12px',
    padding: '48px',
    textAlign: 'center' as const,
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
    margin: 0,
  },
};

export default BeliefsPage;