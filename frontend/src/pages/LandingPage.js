import { ArrowRight, Users, Layout, BarChart3, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 z-0" 
          style={{
            backgroundImage: "url('https://images.pexels.com/photos/236698/pexels-photo-236698.jpeg')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E5C38]/95 via-[#2E5C38]/90 to-[#475569]/90"></div>
        </div>

        <nav className="relative z-10 container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>TGP Bioplastics</span>
            </div>
            <Button 
              onClick={handleLogin}
              data-testid="login-button"
              className="bg-white text-[#2E5C38] hover:bg-white/90 font-medium px-6 transition-all duration-200 ease-out rounded-md"
            >
              Sign in with Google
            </Button>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-24">
          <div className="max-w-4xl">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'Manrope' }}>
              Manufacturing Excellence Through Visual Workflow
            </h1>
            <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl">
              Streamline your bioplastics production with customizable Kanban boards, real-time collaboration, and intelligent deadline tracking.
            </p>
            <Button
              onClick={handleLogin}
              data-testid="get-started-button"
              size="lg"
              className="bg-white text-[#2E5C38] hover:bg-white/90 font-semibold px-8 py-6 text-lg transition-all duration-200 ease-out rounded-md hover:-translate-y-1 shadow-lg"
            >
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-lg border border-[#E2E8F0] hover:border-[#2E5C38] hover:-translate-y-1 transition-all duration-200 ease-out">
            <div className="w-12 h-12 bg-[#2E5C38]/10 rounded-lg flex items-center justify-center mb-4">
              <Layout className="w-6 h-6 text-[#2E5C38]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1E293B] mb-3" style={{ fontFamily: 'Manrope' }}>Customizable Boards</h3>
            <p className="text-[#475569]">Create tailored workflows with flexible columns matching your manufacturing processes.</p>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#E2E8F0] hover:border-[#2E5C38] hover:-translate-y-1 transition-all duration-200 ease-out">
            <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1E293B] mb-3" style={{ fontFamily: 'Manrope' }}>Team Collaboration</h3>
            <p className="text-[#475569]">Work together seamlessly with real-time updates and shared board access.</p>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#E2E8F0] hover:border-[#2E5C38] hover:-translate-y-1 transition-all duration-200 ease-out">
            <div className="w-12 h-12 bg-[#3B82F6]/10 rounded-lg flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-[#3B82F6]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1E293B] mb-3" style={{ fontFamily: 'Manrope' }}>Smart Reminders</h3>
            <p className="text-[#475569]">Never miss a deadline with daily, weekly, and monthly notifications.</p>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#E2E8F0] hover:border-[#2E5C38] hover:-translate-y-1 transition-all duration-200 ease-out">
            <div className="w-12 h-12 bg-[#10B981]/10 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-[#10B981]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1E293B] mb-3" style={{ fontFamily: 'Manrope' }}>Analytics Dashboard</h3>
            <p className="text-[#475569]">Track performance metrics and optimize your production workflow.</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#2E5C38] to-[#475569] py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope' }}>Ready to Transform Your Workflow?</h2>
          <p className="text-white/90 text-lg mb-8">Join TGP Bioplastics in achieving manufacturing excellence.</p>
          <Button
            onClick={handleLogin}
            data-testid="cta-button"
            size="lg"
            className="bg-white text-[#2E5C38] hover:bg-white/90 font-semibold px-8 py-6 text-lg transition-all duration-200 ease-out rounded-md"
          >
            Start Free Today
          </Button>
        </div>
      </div>

      <footer className="bg-[#1E293B] py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-[#94A3B8]">© 2025 TGP Bioplastics. Sustainable manufacturing solutions.</p>
        </div>
      </footer>
    </div>
  );
}