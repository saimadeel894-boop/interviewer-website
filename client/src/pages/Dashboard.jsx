import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ClipboardCheck, PhoneCall, Send, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../services/api.js';
import { titleize } from '../utils/format.js';

const COLORS = ['#2D7DD2', '#38A169', '#E53E3E', '#F59E0B'];

const Dashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then((response) => setData(response.data));
  }, []);

  const taskPie = useMemo(() => {
    if (!data?.taskStats) return [];
    return Object.entries(data.taskStats).map(([name, value]) => ({ name: titleize(name), value }));
  }, [data]);

  const rateLine = useMemo(() => {
    return (data?.submissionsWeekly || []).map((item) => ({
      date: item.date.slice(5),
      interviewSuccessRate: data.interviewSuccessRate
    }));
  }, [data]);

  if (!data) {
    return <div className="text-sm font-semibold text-navy">Loading dashboard...</div>;
  }

  const kpis = [
    { label: 'Developers', value: data.activeCounts.developers, icon: Users },
    { label: 'Callers', value: data.activeCounts.callers, icon: PhoneCall },
    { label: 'Bidders', value: data.activeCounts.bidders, icon: Send },
    { label: 'Task Completion', value: `${data.taskCompletionRate}%`, icon: ClipboardCheck }
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Owner KPI overview and operating charts." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-navy">{item.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h2 className="text-base font-bold text-navy">Submissions Per Day</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.submissionsWeekly.map((item) => ({ ...item, date: item.date.slice(5) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="submissions" fill="#2D7DD2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold text-navy">Task Completion Rate</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskPie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                  {taskPie.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 xl:col-span-2">
          <h2 className="text-base font-bold text-navy">Interview Success Rate</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rateLine}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Line type="monotone" dataKey="interviewSuccessRate" stroke="#38A169" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold text-navy">Pipeline</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(data.interviewPipelineStatus).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-600">{titleize(key)}</span>
                <span className="text-lg font-bold text-navy">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
