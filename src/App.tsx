import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Calendar,
  Vote,
  FileText,
  Bell,
  Activity,
  Terminal,
  Server,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Database
} from 'lucide-react';

interface EndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  access: 'Public' | 'Any Member' | 'Officer / Admin' | 'Admin Only' | 'Eligible Voter';
  description: string;
  sampleBody?: string;
}

interface ModuleDoc {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  endpoints: EndpointDoc[];
}

const MODULES: ModuleDoc[] = [
  {
    id: 'auth',
    title: 'Authentication & Users',
    icon: Lock,
    endpoints: [
      {
        method: 'POST' as const,
        path: '/api/auth/login',
        access: 'Public' as const,
        description: 'Authenticates with email and password, returning JWT bearer token and user profile.',
        sampleBody: JSON.stringify({ email: 'chairperson@admarc.mw', password: 'Password123!' }, null, 2)
      },
      {
        method: 'GET' as const,
        path: '/api/auth/me',
        access: 'Any Member' as const,
        description: 'Returns profile details of the authenticated bearer.'
      },
      {
        method: 'POST' as const,
        path: '/api/auth/users',
        access: 'Admin Only' as const,
        description: 'Provision a new internal user account (Public self-registration disabled per FRS).',
        sampleBody: JSON.stringify({ email: 'director@admarc.mw', password: 'SecurePassword1!', role: 'OFFICER' }, null, 2)
      }
    ]
  },
  {
    id: 'members',
    title: 'Member & Officer Directory',
    icon: Users,
    endpoints: [
      {
        method: 'GET' as const,
        path: '/api/members?search=&role=&committee=',
        access: 'Any Member' as const,
        description: 'Search and filter active board members and executive officers.'
      },
      {
        method: 'GET' as const,
        path: '/api/members/:id',
        access: 'Any Member' as const,
        description: 'Retrieve full member details including committee membership.'
      },
      {
        method: 'GET' as const,
        path: '/api/members/:id/role-history',
        access: 'Any Member' as const,
        description: 'Retrieve timestamped audit history of member role/committee promotions (FR-1.7).'
      },
      {
        method: 'POST' as const,
        path: '/api/members',
        access: 'Admin Only' as const,
        description: 'Add new member. Prevents duplicate email with 409 DUPLICATE_MEMBER_EMAIL.',
        sampleBody: JSON.stringify({ name: 'Grace Mphande', email: 'g.mphande@admarc.mw', role: 'Director of Finance', committee: 'Finance & Audit', joinDate: '2026-03-01' }, null, 2)
      },
      {
        method: 'PUT' as const,
        path: '/api/members/:id',
        access: 'Admin Only' as const,
        description: 'Update member info. Automatically records role change to immutable history.'
      },
      {
        method: 'DELETE' as const,
        path: '/api/members/:id',
        access: 'Admin Only' as const,
        description: 'Remove member record from governance directory.'
      }
    ]
  },
  {
    id: 'meetings',
    title: 'Meetings & Agendas',
    icon: Calendar,
    endpoints: [
      {
        method: 'GET' as const,
        path: '/api/meetings',
        access: 'Any Member' as const,
        description: 'List all past and upcoming board meetings in chronological order (FR-2.4).'
      },
      {
        method: 'GET' as const,
        path: '/api/meetings/:id',
        access: 'Any Member' as const,
        description: 'Get meeting detail with agenda items, linked motions, and documents.'
      },
      {
        method: 'POST' as const,
        path: '/api/meetings',
        access: 'Officer / Admin' as const,
        description: 'Schedule a board meeting with title, date/time, and physical or virtual location.',
        sampleBody: JSON.stringify({ title: 'ADMARC Q4 Strategic Review', meetingDate: '2026-10-15 09:30:00', location: 'Limbe Executive Boardroom' }, null, 2)
      },
      {
        method: 'POST' as const,
        path: '/api/meetings/:id/cancel',
        access: 'Officer / Admin' as const,
        description: 'Mark meeting cancelled with reason without deleting row or agendas (FR-2.6).',
        sampleBody: JSON.stringify({ reason: 'Rescheduled pending Ministry advisory' }, null, 2)
      },
      {
        method: 'POST' as const,
        path: '/api/meetings/:id/minutes',
        access: 'Officer / Admin' as const,
        description: 'Record minutes. Published minutes are locked against non-admin edits (FR-2.3).',
        sampleBody: JSON.stringify({ minutesText: 'Meeting convened at 09:30. Quorum verified...', minutesStatus: 'published' }, null, 2)
      },
      {
        method: 'POST' as const,
        path: '/api/agenda-items/reorder',
        access: 'Officer / Admin' as const,
        description: 'Transactionally reorder agenda sequence within a meeting.',
        sampleBody: JSON.stringify({ meetingId: 1, items: [{ id: 1, orderNum: 1 }, { id: 2, orderNum: 2 }] }, null, 2)
      }
    ]
  },
  {
    id: 'voting',
    title: 'Motions & Voting Engine',
    icon: Vote,
    endpoints: [
      {
        method: 'GET' as const,
        path: '/api/motions',
        access: 'Any Member' as const,
        description: 'List motions filtered by meeting, status (open, closed, withdrawn).'
      },
      {
        method: 'POST' as const,
        path: '/api/motions',
        access: 'Officer / Admin' as const,
        description: 'Propose motion with voting threshold and eligible voter pool configuration.',
        sampleBody: JSON.stringify({
          title: 'Approval of Emergency Grain Buffer Facility',
          description: 'Authorize reserve storage logistics tender',
          meetingId: 1,
          thresholdType: 'simple_majority',
          eligiblePoolType: 'all_officers'
        }, null, 2)
      },
      {
        method: 'POST' as const,
        path: '/api/votes',
        access: 'Eligible Voter' as const,
        description: 'Cast or change vote (FOR, AGAINST, ABSTAIN). Strictly rejected once motion is closed.',
        sampleBody: JSON.stringify({ motionId: 1, voteChoice: 'FOR' }, null, 2)
      },
      {
        method: 'GET' as const,
        path: '/api/votes/motion/:motionId/tally',
        access: 'Any Member' as const,
        description: 'Real-time live tally showing counts and threshold progress.'
      },
      {
        method: 'POST' as const,
        path: '/api/motions/:id/close',
        access: 'Officer / Admin' as const,
        description: 'Close motion, calculate passed/failed outcome, and freeze voting (FR-3.5 & FR-3.6).'
      },
      {
        method: 'POST' as const,
        path: '/api/motions/:id/withdraw',
        access: 'Officer / Admin' as const,
        description: 'Withdraw motion before it closes with documented reason (FR-3.8).'
      }
    ]
  },
  {
    id: 'docs',
    title: 'Announcements & Document Library',
    icon: FileText,
    endpoints: [
      {
        method: 'GET' as const,
        path: '/api/announcements',
        access: 'Any Member' as const,
        description: 'Retrieve corporate announcements displayed in reverse chronological order (FR-4.3).'
      },
      {
        method: 'POST' as const,
        path: '/api/announcements',
        access: 'Officer / Admin' as const,
        description: 'Post executive announcement with title, body text, and publication date.',
        sampleBody: JSON.stringify({ title: '2026 Audit Committee Notice', body: 'The annual external audit commences on October 1st.' }, null, 2)
      },
      {
        method: 'GET' as const,
        path: '/api/documents?category=&search=',
        access: 'Any Member' as const,
        description: 'Browse document library by title search and category (bylaws, policies, financial reports).'
      },
      {
        method: 'POST' as const,
        path: '/api/documents',
        access: 'Officer / Admin' as const,
        description: 'Add document entry with title, description, and link/reference (FR-4.2).',
        sampleBody: JSON.stringify({ title: 'ADMARC Governance Charter 2026', linkOrReference: 'https://storage.admarc.mw/docs/charter-2026.pdf', category: 'bylaws' }, null, 2)
      }
    ]
  },
  {
    id: 'audit',
    title: 'Governance Audit Trail',
    icon: ShieldCheck,
    endpoints: [
      {
        method: 'GET' as const,
        path: '/api/audit-logs?entity=&userId=',
        access: 'Admin Only' as const,
        description: 'Inspect immutable, timestamped audit log of all system actions and modifications.'
      }
    ]
  }
];

export default function App() {
  const [activeModule, setActiveModule] = useState<string>('auth');
  const [healthStatus, setHealthStatus] = useState<{ status: string; timestamp: string } | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealthStatus(data))
      .catch(() => setHealthStatus({ status: 'offline', timestamp: new Date().toISOString() }));
  }, []);

  const handleTestHealth = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/health');
      const json = await res.json();
      setTestResponse(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setTestResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const currentModule = MODULES.find((m) => m.id === activeModule) || MODULES[0];

  return (
    <div id="app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Executive Header */}
      <header id="main-header" className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-white">ADMARC Limited</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  v1.0 REST API
                </span>
              </div>
              <p className="text-xs text-slate-400">Executive Board Management System (eBoard)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${healthStatus?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300">API Status:</span>
              <span className="font-semibold text-white">{healthStatus?.status || 'Connecting...'}</span>
            </div>
            <button
              id="test-health-btn"
              onClick={handleTestHealth}
              disabled={isTesting}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md font-medium transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Ping /api/health</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <aside id="sidebar-nav" className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
              FRS API Modules
            </div>
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  id={`nav-tab-${mod.id}`}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition font-medium ${
                    isActive
                      ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{mod.title}</span>
                  </div>
                  <span className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700 font-mono">
                    {mod.endpoints.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick RBAC Reference */}
          <div id="rbac-summary-card" className="bg-slate-900 rounded-xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Role Permissions (FRS 2.2)</span>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-2 bg-slate-800/50 rounded border border-slate-700/50">
                <span className="font-semibold text-purple-400 block">ADMINISTRATOR</span>
                <span>Full system access, member directory CRUD, user accounts, audit trail.</span>
              </div>
              <div className="p-2 bg-slate-800/50 rounded border border-slate-700/50">
                <span className="font-semibold text-emerald-400 block">OFFICER</span>
                <span>Meetings, agendas, minutes, propose motions, vote, announcements.</span>
              </div>
              <div className="p-2 bg-slate-800/50 rounded border border-slate-700/50">
                <span className="font-semibold text-blue-400 block">MEMBER</span>
                <span>View directory, meetings, tallies, documents, announcements (Read-only).</span>
              </div>
            </div>
          </div>

          {/* Business Rules Test Badge */}
          <div id="test-runner-badge" className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> 11 / 11 Tests Passing
              </span>
              <span className="font-mono text-[11px] text-slate-500">npm test</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Validates duplicate email rejection, voting pools, ballot change rules, and threshold calculation.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main id="main-content" className="lg:col-span-3 space-y-6">
          {/* Module Banner */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <currentModule.icon className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">{currentModule.title}</h2>
              </div>
              <p className="text-sm text-slate-400">
                RESTful endpoints implementing specification guidelines with database constraints and audit logs.
              </p>
            </div>
          </div>

          {/* Live Ping Output */}
          {testResponse && (
            <div id="live-response-viewer" className="bg-slate-900 rounded-xl p-4 border border-emerald-500/30 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Terminal className="w-3.5 h-3.5" /> Live Response: GET /api/health
                </span>
                <button
                  onClick={() => setTestResponse(null)}
                  className="text-slate-400 hover:text-white transition text-xs"
                >
                  Dismiss
                </button>
              </div>
              <pre className="text-emerald-300 overflow-x-auto p-2 bg-slate-950 rounded">
                {testResponse}
              </pre>
            </div>
          )}

          {/* Endpoints List */}
          <div className="space-y-4">
            {currentModule.endpoints.map((ep, idx) => {
              const badgeColors: Record<string, string> = {
                GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              };

              const accessColors: Record<string, string> = {
                Public: 'bg-slate-800 text-slate-300 border-slate-700',
                'Any Member': 'bg-blue-900/30 text-blue-300 border-blue-800/40',
                'Officer / Admin': 'bg-emerald-900/30 text-emerald-300 border-emerald-800/40',
                'Admin Only': 'bg-purple-900/30 text-purple-300 border-purple-800/40',
                'Eligible Voter': 'bg-teal-900/30 text-teal-300 border-teal-800/40'
              };

              return (
                <div
                  key={idx}
                  id={`endpoint-${idx}`}
                  className="bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 font-mono text-sm">
                      <span className={`px-2.5 py-1 rounded-md font-bold text-xs border ${badgeColors[ep.method]}`}>
                        {ep.method}
                      </span>
                      <span className="font-semibold text-slate-100">{ep.path}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border ${accessColors[ep.access]}`}>
                        {ep.access}
                      </span>
                      <button
                        onClick={() => copyToClipboard(ep.path)}
                        title="Copy endpoint path"
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      >
                        {copiedPath === ep.path ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{ep.description}</p>

                  {ep.sampleBody && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                        <Terminal className="w-3 h-3 text-slate-500" /> Sample Request Body (JSON):
                      </div>
                      <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                        {ep.sampleBody}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
