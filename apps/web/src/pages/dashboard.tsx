import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

interface DashboardData {
  user: {
    email: string;
    currentIdentityStatement: string | null;
  } | null;
  topValues: Array<{ id: string; name: string; priority: number }>;
  recentEntries: Array<{
    id: string;
    date: string;
    energyLevel: number | null;
    alignmentScore: number | null;
  }>;
  stats: {
    totalEntries: number;
    averageAlignment: number;
    averageEnergy: number;
    currentStreak: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }

        // Fetch dashboard data from API
        const response = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          const result = await response.json().catch(() => null);
          setError(result?.error || `Failed to load dashboard (${response.status})`);
          setData(null);
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
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
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}>IdentityForge</h1>
          <nav style={styles.nav}>
            <Link href="/dashboard" style={styles.navLink}>Dashboard</Link>
            <Link href="/values" style={styles.navLink}>Values</Link>
            <Link href="/identity" style={styles.navLink}>Identity</Link>
            <Link href="/beliefs" style={styles.navLink}>Beliefs 🆕</Link>
            <Link href="/patterns" style={styles.navLink}>Patterns</Link>
            <button onClick={handleSignOut} style={styles.logoutButton}>Sign Out</button>
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        {error && (
          <section style={styles.errorBanner}>
            {error}
          </section>
        )}

        {/* Welcome Section */}
        <section style={styles.welcomeSection}>
          <h2 style={styles.welcomeTitle}>Welcome back</h2>
          {data?.user?.currentIdentityStatement && (
            <div style={styles.identityStatement}>
              <span style={styles.identityLabel}>Your Identity:</span>
              <p style={styles.identityText}>{data.user.currentIdentityStatement}</p>
            </div>
          )}
        </section>

        {/* Stats Cards */}
        <section style={styles.statsSection}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{data?.stats.currentStreak || 0}</div>
            <div style={styles.statLabel}>Day Streak</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{data?.stats.totalEntries || 0}</div>
            <div style={styles.statLabel}>Total Entries</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{data?.stats.averageEnergy || 0}</div>
            <div style={styles.statLabel}>Avg Energy</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{data?.stats.averageAlignment || 0}</div>
            <div style={styles.statLabel}>Avg Alignment</div>
          </div>
        </section>

        {/* Quick Actions */}
        <section style={styles.actionsSection}>
          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <div style={styles.actionGrid}>
            <Link href="/values-discovery" style={styles.actionCard}>
              <div style={styles.actionIcon}>🎯</div>
              <div style={styles.actionText}>
                <div style={styles.actionTitle}>Discover Values</div>
                <div style={styles.actionDesc}>Explore your core values through conversation</div>
              </div>
            </Link>
            <Link href="/identity-craft" style={styles.actionCard}>
              <div style={styles.actionIcon}>✨</div>
              <div style={styles.actionText}>
                <div style={styles.actionTitle}>Craft Identity</div>
                <div style={styles.actionDesc}>Define your extraordinary self</div>
              </div>
            </Link>
            <Link href="/daily-entry" style={styles.actionCard}>
              <div style={styles.actionIcon}>📝</div>
              <div style={styles.actionText}>
                <div style={styles.actionTitle}>Daily Entry</div>
                <div style={styles.actionDesc}>Reflect on today</div>
              </div>
            </Link>
            <Link href="/coach" style={styles.actionCard}>
              <div style={styles.actionIcon}>💬</div>
              <div style={styles.actionText}>
                <div style={styles.actionTitle}>AI Coach</div>
                <div style={styles.actionDesc}>Get personalized guidance</div>
              </div>
            </Link>
            <Link href="/patterns" style={styles.actionCard}>
              <div style={styles.actionIcon}>📊</div>
              <div style={styles.actionText}>
                <div style={styles.actionTitle}>Pattern Insights</div>
                <div style={styles.actionDesc}>Discover trends in your journey</div>
              </div>
            </Link>
          </div>
        </section>

        {/* Top Values */}
        {data?.topValues && data.topValues.length > 0 && (
          <section style={styles.valuesSection}>
            <h3 style={styles.sectionTitle}>Your Top Values</h3>
            <div style={styles.valuesList}>
              {data.topValues.map((value, index) => (
                <div key={value.id} style={styles.valueItem}>
                  <span style={styles.valueRank}>#{index + 1}</span>
                  <span style={styles.valueName}>{value.name}</span>
                </div>
              ))}
            </div>
            <Link href="/values" style={styles.seeAllLink}>See all values →</Link>
          </section>
        )}

        {/* Recent Entries */}
        {data?.recentEntries && data.recentEntries.length > 0 && (
          <section style={styles.entriesSection}>
            <h3 style={styles.sectionTitle}>Recent Entries</h3>
            <div style={styles.entriesList}>
              {data.recentEntries.map((entry) => (
                <div key={entry.id} style={styles.entryItem}>
                  <div style={styles.entryDate}>{entry.date}</div>
                  <div style={styles.entryStats}>
                    <span style={styles.entryStat}>⚡ {entry.energyLevel || '-'}/10</span>
                    <span style={styles.entryStat}>🎯 {entry.alignmentScore || '-'}/10</span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/entries" style={styles.seeAllLink}>See all entries →</Link>
          </section>
        )}

        {/* Empty State */}
        {(!data?.topValues || data.topValues.length === 0) && (
          <section style={styles.emptyState}>
            <div style={styles.emptyIcon}>🌱</div>
            <h3 style={styles.emptyTitle}>Start Your Journey</h3>
            <p style={styles.emptyText}>
              Begin by discovering your core values - the foundation of who you want to become.
            </p>
            <Link href="/values-discovery" style={styles.startButton}>
              Start Values Discovery
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}

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
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: 0,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  navLink: {
    fontSize: '15px',
    color: '#666',
    textDecoration: 'none',
  },
  logoutButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    background: 'white',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  errorBanner: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  welcomeSection: {
    marginBottom: '32px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 16px 0',
  },
  identityStatement: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    padding: '20px 24px',
    color: 'white',
  },
  identityLabel: {
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    opacity: 0.9,
  },
  identityText: {
    fontSize: '18px',
    margin: '8px 0 0 0',
    fontStyle: 'italic',
  },
  statsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  actionsSection: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 16px 0',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    cursor: 'pointer',
  },
  actionIcon: {
    fontSize: '32px',
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
  },
  actionDesc: {
    fontSize: '14px',
    color: '#666',
    margin: '4px 0 0 0',
  },
  valuesSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  valuesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  valueItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  valueRank: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#667eea',
    width: '32px',
  },
  valueName: {
    fontSize: '16px',
    color: '#333',
  },
  seeAllLink: {
    display: 'inline-block',
    marginTop: '16px',
    fontSize: '14px',
    color: '#667eea',
    textDecoration: 'none',
  },
  entriesSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  entriesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  entryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  entryDate: {
    fontSize: '14px',
    color: '#666',
  },
  entryStats: {
    display: 'flex',
    gap: '16px',
  },
  entryStat: {
    fontSize: '14px',
    color: '#333',
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
};
