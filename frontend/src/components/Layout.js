import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  Grid3X3, 
  Mail, 
  Send, 
  Clock, 
  Headphones, 
  Settings, 
  Plus,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Grid3X3 },
    { name: 'Subjects', href: '/subjects', icon: Mail },
    { name: 'Planner', href: '/planner', icon: Send },
    { name: 'Todos', href: '/todos', icon: Clock },
    { name: 'Goals', href: '/goals', icon: Headphones },
    { name: 'Progress', href: '/progress', icon: Settings },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#121212] relative">
      {/* Decorative background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#1f1f1f,transparent_60%),radial-gradient(circle_at_80%_60%,#1a1a1a,transparent_55%)]" />
      <div className="relative flex flex-1 overflow-hidden pt-8 pl-8 pr-8 pb-6">
  {/* Sidebar */}
  <div className={`fixed left-8 top-8 z-50 w-24 h-[calc(100vh-4rem)] rounded-3xl bg-[#181818]/85 backdrop-blur-xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)] border border-[#2a2a2a] ring-1 ring-black/40 flex flex-col transform transition-transform duration-300 ease-in-out ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
  }`}>
          <div className="flex flex-col h-full items-center py-1 justify-between">
            {/* Logo */}
            <NavLink to="/dashboard" onClick={() => setSidebarOpen(false)} title="Home" className="mt-2 mb-2">
              <img
                src="/logo.png"
                alt="FargateFlow Logo"
                className="w-12 h-12 object-contain drop-shadow-md"
                loading="lazy"
              />
            </NavLink>
            {/* Navigation (excluding Profile) */}
            <nav className="flex-1 flex flex-col items-center gap-8 justify-center">
              {navigation.filter(n => n.name !== 'Profile').map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-semibold shadow group transition-colors duration-300 ease-in-out ring-1 ${isActive ? 'bg-[#67FA3E] text-[#121212] ring-[#67FA3E]' : 'text-[#67FA3E] ring-transparent hover:bg-[#232323] hover:text-white hover:ring-[#67FA3E]'}`}
                    onClick={() => setSidebarOpen(false)}
                    title={item.name}
                  >
                    <Icon className="w-7 h-7" />
                  </NavLink>
                );
              })}
            </nav>
            {/* Bottom Profile avatar */}
            <div className="mb-4">
              <NavLink
                to="/profile"
                className={({ isActive }) => `w-14 h-14 rounded-2xl flex items-center justify-center shadow ring-1 transition-colors duration-300 ease-in-out overflow-hidden ${isActive ? 'bg-[#67FA3E] text-[#121212] ring-[#67FA3E]' : 'text-[#67FA3E] ring-transparent hover:bg-[#232323] hover:text-white hover:ring-[#67FA3E]'}`}
                title="Profile"
                onClick={() => setSidebarOpen(false)}
              >
                {user?.profile_image ? (
                  <img
                    src={`/${user.profile_image}`}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-2xl"
                    loading="lazy"
                  />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </NavLink>
            </div>
          </div>
        </div>
        {/* Main content */}
  <div className="flex-1 flex flex-col overflow-auto lg:ml-32">
          {/* Header */}
          <header className="sticky top-8 mx-auto w-full max-w-[1400px] h-20 rounded-3xl bg-[#181818]/80 backdrop-blur-xl border border-[#2a2a2a] ring-1 ring-black/40 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.55)] flex items-center px-10 justify-between transition-colors">
            <div className="flex items-center gap-6 flex-shrink-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-[#67FA3E] hover:text-white hover:bg-[#232323] border border-[#232323]"
              >
                <Grid3X3 className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold leading-tight" style={{color: '#67FA3E'}}>
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex-1 hidden md:flex justify-center px-4">
              <span className="text-[14px] tracking-wide font-medium uppercase text-center select-none" style={{color:'#86ffad', letterSpacing:'0.12em'}}>
                From Pipeline to Planner: Smart Flow, Smarter Study.
              </span>
            </div>
            <div className="flex items-center space-x-6 flex-shrink-0">
              <NavLink
                to="/profile"
                className={({ isActive }) => `relative w-12 h-12 rounded-full border flex items-center justify-center overflow-hidden transition-all duration-200 ${isActive ? 'border-[#67FA3E] ring-1 ring-[#67FA3E]/40 scale-105' : 'border-[#232323] hover:border-[#67FA3E] hover:scale-105'} bg-[#232323]`}
                title="Profile"
              >
                {user?.profile_image ? (
                  <img
                    src={`/${user.profile_image}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <User className="w-6 h-6 text-[#67FA3E]" />
                )}
              </NavLink>
            </div>
          </header>
          {/* Page content */}
          <main className="px-2 pt-8 pb-4 flex-1 overflow-auto fade-in max-w-[1400px] mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
