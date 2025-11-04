import { useEffect, useState } from 'react';
import api from '../services/api';
import { Users, Activity, Percent, Mail } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

// Reusable Stat Card Component
const StatCard = ({ title, value, icon, unit = '', color = 'text-indigo-600' }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center space-x-4 transition-all duration-300 hover:shadow-xl">
    <div className={`p-3 rounded-full ${color.replace('text', 'bg')}-100`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900">
        {value}
        {unit && <span className="text-lg ml-1 font-medium">{unit}</span>}
      </p>
    </div>
  </div>
);

// Loading skeleton for stat cards
const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center space-x-4 animate-pulse">
    <div className="p-3 rounded-full bg-gray-200 h-12 w-12"></div>
    <div>
      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-8 bg-gray-300 rounded w-16"></div>
    </div>
  </div>
);

// Loading skeleton for the chart
const ChartSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl shadow-lg animate-pulse h-[400px]">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-full bg-gray-200 rounded"></div>
  </div>
);

export const DashboardView = () => {
  const [stats, setStats] = useState({
    total_contacts: 0,
    new_contacts_30_days: 0,
    total_messages_in: 0,
    total_messages_out: 0,
    automation_success_rate: 0.0,
    chart_data: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setError("Failed to load dashboard data. Please try refreshing.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* --- Main Stat Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard 
              title="Total Contacts" 
              value={stats.total_contacts} 
              icon={<Users className="w-6 h-6 text-indigo-600" />} 
              color="text-indigo-600"
            />
            <StatCard 
              title="New Contacts (30 Days)" 
              value={stats.new_contacts_30_days} 
              icon={<Activity className="w-6 h-6 text-green-600" />}
              color="text-green-600"
            />
            <StatCard 
              title="Automation Success" 
              value={stats.automation_success_rate}
              unit="%"
              icon={<Percent className="w-6 h-6 text-blue-600" />}
              color="text-blue-600"
            />
            <StatCard 
              title="Total Messages Sent" 
              value={stats.total_messages_out} 
              icon={<Mail className="w-6 h-6 text-yellow-600" />}
              color="text-yellow-600"
            />
          </>
        )}
      </div>

      {/* --- Analytics Chart --- */}
      <div className="w-full">
        {loading ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Message Volume (Last 7 Days)
            </h2>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={stats.chart_data}
                  margin={{
                    top: 5,
                    right: 20,
                    left: -10,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="inbound" name="Messages Received" fill="#818CF8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outbound" name="Automated Replies" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;