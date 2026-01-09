import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PendingApproval() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          withCredentials: true
        });
        setUser(response.data);
        
        // If approved, redirect to dashboard
        if (response.data.approved) {
          navigate("/dashboard");
        }
      } catch (error) {
        navigate("/");
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-8 text-center">
          <div className="w-16 h-16 bg-[#F59E0B]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-[#F59E0B]" />
          </div>

          <h1 className="text-2xl font-bold text-[#1E293B] mb-2" style={{ fontFamily: 'Manrope' }}>
            Approval Pending
          </h1>
          
          <p className="text-[#475569] mb-6">
            Your account is waiting for admin approval. You'll be able to access TGP Bioplastics Kanban Board once an administrator approves your account.
          </p>

          {user && (
            <div className="bg-[#F8FAFC] rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-[#64748B] mb-1">Signed in as:</p>
              <div className="flex items-center gap-3">
                <img
                  src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium text-[#1E293B]">{user.name}</p>
                  <p className="text-sm text-[#64748B]">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-lg p-4 mb-6">
            <p className="text-sm text-[#92400E]">
              <strong>What to do:</strong> Contact your TGP Bioplastics administrator to approve your account.
            </p>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
