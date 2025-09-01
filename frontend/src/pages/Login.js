import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    const result = await login(data.email, data.password);
    setIsLoading(false);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] py-12 px-4 sm:px-6 lg:px-8 fade-in" style={{cursor: 'url(/custom-cursor.svg), pointer'}}>
      <div className="max-w-md w-full space-y-8 auth-card p-8 rounded-2xl">
        <div className="stagger-children">
          <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-xl bg-[#181818] border border-[#232323] overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold" style={{color: '#67FA3E'}}>
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-xs font-medium" style={{color:'#86ffad', letterSpacing:'0.08em'}}>
            From Pipeline to Planner: Smart Flow, Smarter Study.
          </p>
          <p className="mt-2 text-center text-sm" style={{color: '#b6ffcb'}}>
            Or{' '}
            <Link
              to="/register"
              className="font-medium hover:underline"
              style={{color: '#67FA3E'}}
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6 fade-in stagger-children" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium" style={{color: '#b6ffcb'}}>
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`auth-input ${errors.email ? 'error' : ''}`}
                  placeholder="Enter your email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  style={{transition: 'box-shadow 0.2s'}}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium" style={{color: '#b6ffcb'}}>
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`auth-input pr-10 ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  style={{transition: 'box-shadow 0.2s'}}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" style={{color: '#b6ffcb'}} />
                  ) : (
                    <Eye className="h-5 w-5" style={{color: '#b6ffcb'}} />
                  )}
                </button>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 border-[#67FA3E] rounded bg-[#181818] text-[#67FA3E] focus:ring-[#67FA3E] transition-colors"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm" style={{color: '#b6ffcb'}}>
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium hover:underline" style={{color: '#67FA3E'}}>
                Forgot your password?
              </a>
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-5 text-sm font-medium btn-auth-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#121212] mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
          <div className="text-center">
            <p className="text-sm" style={{color: '#b6ffcb'}}>
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium hover:underline"
                style={{color: '#67FA3E'}}
              >
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 