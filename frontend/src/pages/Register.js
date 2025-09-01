import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    const result = await registerUser(data.name, data.email, data.password);
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
            Create your account
          </h2>
          <p className="mt-2 text-center text-xs font-medium" style={{color:'#86ffad', letterSpacing:'0.08em'}}>
            From Pipeline to Planner: Smart Flow, Smarter Study.
          </p>
          <p className="mt-2 text-center text-sm" style={{color: '#b6ffcb'}}>
            Or{' '}
            <Link
              to="/login"
              className="font-medium hover:underline"
              style={{color: '#67FA3E'}}
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6 fade-in stagger-children" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium" style={{color: '#b6ffcb'}}>
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className={`auth-input ${errors.name ? 'error' : ''}`}
                  placeholder="Enter your full name"
                  {...register('name', {
                    required: 'Name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters'
                    },
                    maxLength: {
                      value: 50,
                      message: 'Name must be less than 50 characters'
                    }
                  })}
                  style={{transition: 'box-shadow 0.2s'}}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>
            </div>
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
                  autoComplete="new-password"
                  required
                  className={`auth-input pr-10 ${errors.password ? 'error' : ''}`}
                  placeholder="Create a password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
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
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium" style={{color: '#b6ffcb'}}>
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className={`auth-input pr-10 ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Confirm your password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  style={{transition: 'box-shadow 0.2s'}}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center input-icon-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" style={{color: '#b6ffcb'}} />
                  ) : (
                    <Eye className="h-5 w-5" style={{color: '#b6ffcb'}} />
                  )}
                </button>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              required
              className="h-4 w-4 border-[#67FA3E] rounded bg-[#181818] text-[#67FA3E] focus:ring-[#67FA3E]"
              {...register('agreeTerms', {
                required: 'You must agree to the terms and conditions'
              })}
            />
            <label htmlFor="agree-terms" className="ml-2 block text-sm" style={{color: '#b6ffcb'}}>
              I agree to the{' '}
              <a href="#" className="hover:underline" style={{color: '#67FA3E'}}>
                Terms and Conditions
              </a>
            </label>
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
                  Creating account...
                </div>
              ) : (
                'Create account'
              )}
            </button>
          </div>
          <div className="text-center">
            <p className="text-sm" style={{color: '#b6ffcb'}}>
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium hover:underline"
                style={{color: '#67FA3E'}}
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register; 