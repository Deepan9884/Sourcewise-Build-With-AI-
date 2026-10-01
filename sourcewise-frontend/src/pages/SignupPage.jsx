import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { UserPlus, Eye, EyeOff, CheckCircle2, User, Mail, Lock, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import LandingBackground from '../components/landing/LandingBackground'
import { ParticleBackground } from '../components/ui/particle-background'
import { AmbientLight } from '../components/ui/ambient-light'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const calculatePasswordStrength = (pass) => {
  if (!pass) return { score: 0, label: '', color: 'bg-transparent' }
  let score = 0
  if (pass.length >= 6) score++
  if (pass.length >= 10) score++
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-400', textColor: 'text-red-500' }
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-400', textColor: 'text-amber-600' }
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-emerald-400', textColor: 'text-emerald-600' }
  return { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600' }
}

export default function SignupPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const password = watch("password", "")
  const strength = calculatePasswordStrength(password)

  const onSubmit = async (data) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: data.name,
        email: data.email,
        password: data.password,
      })

      login(response.data.user, response.data.token)
      navigate('/plan')
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = () => {
    if (import.meta.env.VITE_GOOGLE_AUTH_URL) {
      window.location.href = import.meta.env.VITE_GOOGLE_AUTH_URL
    } else {
      setError('Google Sign-Up will be available soon. Please register with your email.')
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface relative flex flex-col justify-between overflow-x-hidden">
      {/* Rich Atmospheric Landing Background (Static mode for rock-solid stability) */}
      <LandingBackground staticMode={true} />

      {/* Floating Golden Ember Particles */}
      <ParticleBackground color="amber" particleCount={20} />

      {/* Ambient Radial Lighting Glows */}
      <AmbientLight position="top-right" intensity="lg" color="candle" />
      <AmbientLight position="bottom-left" intensity="md" color="warm" />

      {/* Top Header Bar */}
      <header className="relative z-20 w-full px-6 sm:px-10 lg:px-14 pt-5 sm:pt-6 shrink-0 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <img
            src="/logo-mark.png"
            alt="SourceWise logo"
            className="h-11 w-11 sm:h-12 sm:w-12 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <img
            src="/text.png"
            alt="SourceWise"
            className="h-9 sm:h-10 w-auto object-contain object-left"
          />
        </Link>

        {/* Back to Home Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary px-4 py-2 rounded-full bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/40 hover:border-primary-container/40 shadow-xs hover:shadow-sm transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Centered layout: Executive Showcase on Left, Form Box on Right with spacious gap */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full max-w-5xl xl:max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-20 xl:gap-28">
          
          {/* Left Column: Visual Mascot & Headline (Rock-solid, ample gap to card) */}
          <div className="w-full max-w-[390px] xl:max-w-[430px] shrink-0 hidden lg:flex flex-col items-center text-center relative lg:self-center">
            {/* Ambient radial glow behind the mascot to blend seamlessly with the page bg */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-radial-gradient from-primary-fixed/35 via-amber-warm/15 to-transparent rounded-full blur-3xl opacity-70 -z-10" />

            {/* Showcase Title & Subtitle */}
            <h2 className="font-display-hero text-2xl xl:text-3xl font-extrabold text-on-surface tracking-tight leading-snug">
              Start Your Journey to Academic Mastery.
            </h2>
            <p className="mt-1 text-xs xl:text-sm text-on-surface-variant max-w-sm leading-relaxed">
              Turn textbooks, lecture slides, and notes into an interactive, fox-smart AI study companion.
            </p>

            {/* Mascot Display with stable grounded illustration & speech bubble */}
            <div className="relative w-full flex flex-col items-center my-3">
              {/* Friendly Speech Bubble */}
              <div className="mb-2 px-3.5 py-1.5 rounded-full bg-white/75 backdrop-blur-md border border-outline-variant/30 shadow-xs flex items-center gap-2 text-xs font-semibold text-on-surface">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ring-3 ring-emerald-500/20 shrink-0" />
                <span>Hey there! I&apos;m your AI companion. Let&apos;s make studying lighter!</span>
              </div>

              {/* Mascot Image - Grounded & stable without jitter/bobbing */}
              <div className="relative w-full flex items-center justify-center py-2">
                <div className="pointer-events-none absolute bottom-1 inset-x-12 h-7 bg-radial-gradient from-black/15 via-primary/5 to-transparent blur-lg rounded-full" />
                <img
                  src="/signup.png"
                  alt="New student meeting the SourceWise fox companion"
                  className="relative w-full h-auto max-h-[210px] xl:max-h-[240px] max-w-[330px] xl:max-w-[360px] object-contain select-none pointer-events-none drop-shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Upgraded Create Account Card with Glassmorphism & Rock-solid Dimensions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[390px] lg:max-w-[420px] min-h-[570px] lg:min-h-[590px] rounded-[24px] p-5 sm:p-6 relative overflow-hidden transition-all duration-300 flex flex-col justify-between"
            style={{
              background: 'linear-gradient(145deg, hsla(28 35% 100% / 0.60) 0%, hsla(14 30% 98% / 0.40) 100%)',
              backdropFilter: 'blur(20px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
              border: '1px solid hsla(14 35% 75% / 0.25)',
              boxShadow: '0 12px 32px -8px hsla(14 45% 45% / 0.07), 0 1px 0 hsla(38 80% 95% / 0.5) inset',
            }}
          >
            {/* Subtle decorative radiant glow inside card */}
            <div className="pointer-events-none absolute -top-16 -right-16 w-36 h-36 bg-gradient-to-br from-primary-fixed/35 via-amber-warm/15 to-transparent rounded-full blur-2xl" />

            <h1 className="font-headline-lg text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
              Create Account
            </h1>
            <p className="mt-0.5 font-body-md text-xs text-on-surface-variant leading-relaxed">
              Get started in 30 seconds. No credit card required.
            </p>

            {/* Continue with Google Button */}
            <div className="mt-3.5">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="w-full h-10 rounded-xl bg-white/60 hover:bg-white/85 border border-outline-variant/40 hover:border-primary-container/40 shadow-2xs hover:shadow-xs transition-all duration-200 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-semibold text-on-surface active:scale-[0.99]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3 my-2.5">
                <div className="h-px bg-outline-variant/25 flex-1" />
                <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider font-semibold whitespace-nowrap">
                  or continue with email
                </span>
                <div className="h-px bg-outline-variant/25 flex-1" />
              </div>
            </div>

            <form className="space-y-2.5" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="p-2.5 bg-red-50/90 border border-red-200/80 rounded-xl text-red-700 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-label-md text-xs font-semibold text-on-surface mb-0.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    {...register("name", { required: "Name is required" })}
                    className="h-10 rounded-xl bg-white/50 border-outline-variant/40 placeholder:text-on-surface-variant/40 focus-visible:bg-white/80 focus-visible:border-primary-container focus-visible:ring-2 focus-visible:ring-primary-container/20 pl-10 pr-3 text-xs sm:text-sm font-medium transition-all duration-200"
                  />
                </div>
                {errors.name && <span className="text-xs text-destructive mt-0.5 block">{errors.name.message}</span>}
              </div>

              <div>
                <label className="block font-label-md text-xs font-semibold text-on-surface mb-0.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50 pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="you@university.edu"
                    {...register("email", { required: "Email is required" })}
                    className="h-10 rounded-xl bg-white/50 border-outline-variant/40 placeholder:text-on-surface-variant/40 focus-visible:bg-white/80 focus-visible:border-primary-container focus-visible:ring-2 focus-visible:ring-primary-container/20 pl-10 pr-3 text-xs sm:text-sm font-medium transition-all duration-200"
                  />
                </div>
                {errors.email && <span className="text-xs text-destructive mt-0.5 block">{errors.email.message}</span>}
              </div>

              <div>
                <label className="block font-label-md text-xs font-semibold text-on-surface mb-0.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50 pointer-events-none" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    {...register("password", { 
                      required: "Password is required",
                      minLength: { value: 6, message: "Password must be at least 6 characters" }
                    })}
                    className="h-10 rounded-xl bg-white/50 border-outline-variant/40 placeholder:text-on-surface-variant/40 focus-visible:bg-white/80 focus-visible:border-primary-container focus-visible:ring-2 focus-visible:ring-primary-container/20 pl-10 pr-10 text-xs sm:text-sm font-medium transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && <span className="text-xs text-destructive mt-0.5 block">{errors.password.message}</span>}

                {/* Real-time Password Strength Meter */}
                {password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant/70">Password strength</span>
                      <span className={`font-semibold ${strength.textColor}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-full rounded-full transition-all duration-300 ${
                            level <= strength.score ? strength.color : 'bg-surface-container-high'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-[10px] text-on-surface-variant/60 flex items-center gap-1.5 pt-0.5">
                      <CheckCircle2 className={`w-3 h-3 ${password.length >= 6 ? 'text-emerald-500' : 'text-on-surface-variant/40'}`} />
                      <span>Min 6 characters</span>
                      <span className="text-on-surface-variant/30">•</span>
                      <span className={strength.score >= 3 ? 'text-emerald-600 font-medium' : ''}>Numbers/symbols</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Strengthened Primary CTA Button */}
              <Button 
                type="submit" 
                className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-r from-primary-container via-[#E07A5F] to-primary hover:opacity-95 text-on-primary text-xs sm:text-sm font-bold shadow-[0_10px_24px_-6px_rgba(224,122,95,0.4)] hover:shadow-[0_14px_30px_-6px_rgba(224,122,95,0.5)] transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 mt-1" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </div>
                )}
              </Button>
              
              <p className="text-center text-xs text-on-surface-variant pt-0.5">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-primary-container hover:text-primary transition-colors">
                  Log in
                </Link>
              </p>
            </form>
          </motion.div>

        </div>
      </main>

      {/* Bottom spacer for balanced layout */}
      <div className="h-2 shrink-0" />
    </div>
  )
}
