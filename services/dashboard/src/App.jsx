import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import {
    Zap, Users, Activity, Clock, Server,
    ShieldAlert, Database, ArrowUpRight
} from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3002'); // Worker service will host the WS

const App = () => {
    const [stats, setStats] = useState({
        totalEvents: 0,
        activeUsers: 0,
        throughput: 0,
        rateLimited: 0
    });

    const [history, setHistory] = useState([]);
    const [recentEvents, setRecentEvents] = useState([]);

    useEffect(() => {
        // Initial fetch
        fetch('http://localhost:3002/api/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data.current);
                setHistory(data.history);
                setRecentEvents(data.recent);
            })
            .catch(err => console.error('Failed to fetch stats:', err));

        // Listen for real-time updates
        socket.on('stats:update', (data) => {
            setStats(data.current);
            setHistory(prev => [...prev.slice(-19), data.point]);
        });

        socket.on('event:new', (event) => {
            setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
        });

        return () => socket.disconnect();
    }, []);

    return (
        <div className="min-h-screen p-8 bg-background font-sans">
            {/* Header */}
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-display font-bold text-white tracking-tight flex items-center gap-3">
                        <Activity className="text-accent h-10 w-10 animate-pulse" />
                        VORTEX ANALYTICS
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Distributed Real-Time Event Processing Engine</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full border border-success/20 font-bold text-sm">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                        </span>
                        SYSTEM ONLINE
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                        <Server className="text-slate-400" />
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    icon={<Zap className="text-yellow-400" />}
                    label="Total Ingested"
                    value={stats.totalEvents.toLocaleString()}
                    suffix="events"
                />
                <StatCard
                    icon={<Users className="text-blue-400" />}
                    label="Active Sources"
                    value={stats.activeUsers}
                    suffix="nodes"
                />
                <StatCard
                    icon={<Activity className="text-success" />}
                    label="Throughput"
                    value={stats.throughput.toFixed(2)}
                    suffix="ev/sec"
                />
                <StatCard
                    icon={<ShieldAlert className="text-red-400" />}
                    label="Rate Limited"
                    value={stats.rateLimited}
                    suffix="blocks"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Chart Column */}
                <div className="lg:col-span-2 glass-card p-6 min-h-[400px]">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="text-accent" /> Ingestion Velocity
                        </h3>
                        <div className="text-slate-400 text-sm font-medium">Last 20 Samples (50ms interval)</div>
                    </div>
                    <div className="h-full max-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorVal)"
                                    strokeWidth={3}
                                    animationDuration={300}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* List Column */}
                <div className="glass-card flex flex-col">
                    <div className="p-6 border-b border-slate-800 bg-slate-800/20">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Database className="text-accent" /> Live Propagation
                        </h3>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[400px]">
                        {recentEvents.map((event, i) => (
                            <div
                                key={event.event_id || i}
                                className={`p-4 border-b border-slate-800/50 flex justify-between items-center transition-all ${i === 0 ? 'bg-accent/5' : ''}`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                                        <span className="font-bold text-sm text-slate-200 uppercase">{event.type}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">ID: ...{event.event_id?.slice(-8)}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">
                                        {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-center">
                        <button className="text-accent text-sm font-bold flex items-center gap-1 hover:underline">
                            View All Events <ArrowUpRight size={14} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, suffix }) => (
    <div className="glass-card p-6 glow-blue group hover:border-accent/50 transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-800 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
            <ArrowUpRight className="text-slate-600 group-hover:text-accent" size={18} />
        </div>
        <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">{label}</div>
        <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold text-white">{value}</span>
            <span className="text-slate-500 font-medium text-sm">{suffix}</span>
        </div>
    </div>
);

export default App;
