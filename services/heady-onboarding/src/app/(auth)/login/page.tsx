export const dynamic = "force-dynamic";
import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SignInProviders } from "@/components/auth/sign-in-providers"

export const metadata: Metadata = {
  title: "Sign In | HeadyMe",
  description: "Sign in to your HeadyMe command center",
}

export default async function LoginPage() {
  const session = await auth()

  if (session?.user) {
    if (!session.user.onboardingComplete) {
      redirect("/onboarding/create-account")
    }
    redirect("/dashboard")
  }

  return (
    <div className="auth-page">
      {/* Animated Background */}
      <div className="auth-bg">
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-bg-orb auth-bg-orb-2" />
        <div className="auth-bg-orb auth-bg-orb-3" />
      </div>

      {/* Auth Card */}
      <div className="auth-card">
        {/* Sacred Geometry Ring */}
        <div className="auth-geo-ring">
          <svg viewBox="0 0 120 120" className="auth-geo-svg">
            <circle cx="60" cy="60" r="55" fill="none" stroke="#00d4aa" strokeWidth="0.5" opacity="0.3" />
            <circle cx="60" cy="60" r="40" fill="none" stroke="#00d4aa" strokeWidth="0.3" opacity="0.2" />
            <circle cx="60" cy="60" r="25" fill="none" stroke="#00d4aa" strokeWidth="0.3" opacity="0.15" />
            <polygon
              points="60,5 108,32.5 108,87.5 60,115 12,87.5 12,32.5"
              fill="none"
              stroke="#00d4aa"
              strokeWidth="0.5"
              opacity="0.25"
            />
            <polygon
              points="60,20 95,42 95,78 60,100 25,78 25,42"
              fill="none"
              stroke="#00d4aa"
              strokeWidth="0.4"
              opacity="0.2"
            />
          </svg>
          <div className="auth-logo-hex">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="none" stroke="#00d4aa" strokeWidth="2" />
              <circle cx="20" cy="20" r="5" fill="#00d4aa" />
            </svg>
          </div>
        </div>

        <h2 className="auth-title">HeadyMe</h2>
        <p className="auth-sub">Sign in to access your command center</p>

        <SignInProviders />
      </div>
    </div>
  )
}
