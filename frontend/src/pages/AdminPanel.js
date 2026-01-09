import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Users, Layout as LayoutIcon, FileText, BarChart3, UserX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userToRemove, setUserToRemove] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, analyticsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/users`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/admin/analytics`, { withCredentials: true })
      ]);
      setUsers(usersRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      toast.error("Failed to load admin panel");
      if (error.response?.status === 403) {
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/admin/users/${userId}/role?role=${newRole}`,
        {},
        { withCredentials: true }
      );
      toast.success("User role updated");
      fetchData();
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/admin/users/${userId}/approve`,
        {},
        { withCredentials: true }
      );
      toast.success("User approved");
      fetchData();
    } catch (error) {
      console.error("Failed to approve user:", error);
      toast.error("Failed to approve user");
    }
  };

  const handleRejectUser = async (userId) => {
    if (!window.confirm("Are you sure you want to reject this user? This will delete their account.")) {
      return;
    }
    try {
      await axios.delete(
        `${BACKEND_URL}/api/admin/users/${userId}`,
        { withCredentials: true }
      );
      toast.success("User rejected");
      fetchData();
    } catch (error) {
      console.error("Failed to reject user:", error);
      toast.error("Failed to reject user");
    }
  };

  const handleRemoveUser = async (userId, userName) => {
    console.log("Remove user clicked:", userId, userName);
    
    const confirmed = window.confirm(
      `Are you sure you want to remove ${userName} from the organization?\n\nThis will:\n• Delete their account\n• Remove all their sessions\n• They will need to sign up again\n\nThis action cannot be undone.`
    );
    
    console.log("User confirmed removal:", confirmed);
    
    if (!confirmed) {
      return;
    }

    try {
      console.log("Sending delete request for user:", userId);
      const response = await axios.delete(
        `${BACKEND_URL}/api/admin/users/${userId}`,
        { withCredentials: true }
      );
      console.log("Delete response:", response);
      toast.success("User removed successfully");
      fetchData();
    } catch (error) {
      console.error("Failed to remove user:", error);
      console.error("Error response:", error.response);
      toast.error("Failed to remove user");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#2E5C38] border-r-transparent"></div>
          <p className="mt-4 text-[#475569]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" style={{ fontFamily: 'Manrope' }}>
                Admin Panel
              </h1>
              <p className="text-sm text-[#475569]">Manage users and view analytics</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#3B82F6]/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-[#3B82F6]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#1E293B] mb-1" style={{ fontFamily: 'Manrope' }}>
              {analytics?.total_users || 0}
            </h3>
            <p className="text-[#475569]">Total Users</p>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#2E5C38]/10 rounded-lg flex items-center justify-center">
                <LayoutIcon className="w-6 h-6 text-[#2E5C38]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#1E293B] mb-1" style={{ fontFamily: 'Manrope' }}>
              {analytics?.total_boards || 0}
            </h3>
            <p className="text-[#475569]">Total Boards</p>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#F59E0B]" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-[#1E293B] mb-1" style={{ fontFamily: 'Manrope' }}>
              {analytics?.total_cards || 0}
            </h3>
            <p className="text-[#475569]">Total Cards</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0]">
          <div className="p-6 border-b border-[#E2E8F0]">
            <h2 className="text-xl font-semibold text-[#1E293B]" style={{ fontFamily: 'Manrope' }}>
              Pending Approvals
            </h2>
          </div>
          <div className="overflow-x-auto">
            {users.filter(u => !u.approved).length > 0 ? (
              <table className="w-full">
                <thead className="bg-[#FEF3C7]">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-[#92400E]">User</th>
                    <th className="text-left p-4 text-sm font-medium text-[#92400E]">Email</th>
                    <th className="text-left p-4 text-sm font-medium text-[#92400E]">Joined</th>
                    <th className="text-left p-4 text-sm font-medium text-[#92400E]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => !u.approved).map((user) => (
                    <tr key={user.user_id} className="border-t border-[#E2E8F0]" data-testid={`pending-user-${user.user_id}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                            alt={user.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <span className="font-medium text-[#1E293B]">{user.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-[#475569]">{user.email}</td>
                      <td className="p-4 text-[#475569]">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveUser(user.user_id)}
                            data-testid={`approve-${user.user_id}`}
                            className="bg-[#10B981] hover:bg-[#10B981]/90 text-white"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectUser(user.user_id)}
                            data-testid={`reject-${user.user_id}`}
                            className="text-[#EF4444] border-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-[#64748B]">
                No pending approvals
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] mt-8">
          <div className="p-6 border-b border-[#E2E8F0]">
            <h2 className="text-xl font-semibold text-[#1E293B]" style={{ fontFamily: 'Manrope' }}>
              Approved Users
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-[#475569]">User</th>
                  <th className="text-left p-4 text-sm font-medium text-[#475569]">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-[#475569]">Role</th>
                  <th className="text-left p-4 text-sm font-medium text-[#475569]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.approved !== false).map((user) => (
                  <tr key={user.user_id} className="border-t border-[#E2E8F0]" data-testid={`user-row-${user.user_id}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                          alt={user.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <span className="font-medium text-[#1E293B]">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[#475569]">{user.email}</td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-[#2E5C38] text-white' : 'bg-[#E2E8F0] text-[#475569]'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleChange(user.user_id, user.role === 'admin' ? 'user' : 'admin')}
                          data-testid={`toggle-role-${user.user_id}`}
                          className="text-[#2E5C38] border-[#2E5C38] hover:bg-[#2E5C38] hover:text-white"
                        >
                          {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveUser(user.user_id, user.name);
                          }}
                          data-testid={`remove-user-${user.user_id}`}
                          className="text-[#EF4444] border-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
