"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // TODO: Implementar reset de password
      console.log('Reset password for:', email);
      
      // Simular envio de email
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSuccess(true);
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl">
          {/* Gradient Top Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
          
          <div className="p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10">
            <div className="flex flex-col space-y-6 sm:space-y-8">
              {/* Back Button */}
              <Link href="/login">
                <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </button>
              </Link>

              {!isSuccess ? (
                <>
                  {/* Header */}
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                      Reset your password
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base">
                      Enter your email and we'll send you a link to reset your password
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    {/* Email Field */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="email"
                          id="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200"
                    >
                      {isLoading ? 'Sending...' : 'Send reset link'}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  {/* Success Message */}
                  <div className="space-y-4 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <svg
                        className="w-8 h-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-slate-900">
                        Check your email
                      </h2>
                      <p className="text-slate-500 text-sm">
                        We've sent a password reset link to
                      </p>
                      <p className="text-slate-700 font-medium">
                        {email}
                      </p>
                    </div>

                    <div className="pt-4">
                      <Link href="/login">
                        <Button
                          className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200"
                        >
                          Back to sign in
                        </Button>
                      </Link>
                    </div>

                    <button
                      onClick={() => {
                        setIsSuccess(false);
                        setEmail('');
                      }}
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Didn't receive the email? Try again
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Spacer for mobile */}
        <div className="mt-8 text-center text-xs text-slate-400 sm:hidden">
          <p>&nbsp;</p>
        </div>
      </div>
    </div>
  );
}
