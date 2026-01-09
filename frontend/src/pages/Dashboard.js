import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Layout, Bell, LogOut, Settings, BarChart3, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [boards, setBoards] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBoard, setNewBoard] = useState({ 
    name: "", 
    description: "",
    customLimits: false,
    todoLimit: 15,
    wipLimit: 5
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, boardsRes, notifRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/auth/me`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/boards`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/notifications`, { withCredentials: true })
      ]);
      setUser(userRes.data);
      setBoards(boardsRes.data);
      setNotifications(notifRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoard.name.trim()) {
      toast.error("Board name is required");
      return;
    }

    try {
      const boardData = {
        name: newBoard.name,
        description: newBoard.description,
        custom_limits: newBoard.customLimits ? {
          todo_limit: newBoard.todoLimit,
          wip_limit: newBoard.wipLimit
        } : null
      };
      
      await axios.post(
        `${BACKEND_URL}/api/boards`,
        boardData,
        { withCredentials: true }
      );
      toast.success("Board created successfully");
      setShowCreateDialog(false);
      setNewBoard({ 
        name: "", 
        description: "",
        customLimits: false,
        todoLimit: 15,
        wipLimit: 5
      });
      fetchData();
    } catch (error) {
      console.error("Failed to create board:", error);
      toast.error("Failed to create board");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleDeleteBoard = async (boardId, boardName) => {
    if (!window.confirm(`Are you sure you want to delete "${boardName}"? This will delete all columns, cards, and questions. This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(
        `${BACKEND_URL}/api/boards/${boardId}`,
        { withCredentials: true }
      );
      toast.success("Board deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Failed to delete board:", error);
      if (error.response?.status === 403) {
        toast.error("Only the board owner can delete the board");
      } else {
        toast.error("Failed to delete board");
      }
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
      <nav className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50 backdrop-blur-md bg-white/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#2E5C38] flex items-center justify-center">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#1E293B]" style={{ fontFamily: 'Manrope' }}>TGP Bioplastics</span>
            </div>

            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    data-testid="notifications-button"
                  >
                    <Bell className="w-5 h-5" />
                    {notifications.length > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-[#EF4444] rounded-full"></span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-[#1E293B]" style={{ fontFamily: 'Manrope' }}>
                      Deadline Notifications
                    </h3>
                    {notifications.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {notifications.map((notif, idx) => (
                          <div 
                            key={idx} 
                            className={`p-3 rounded-lg border ${
                              notif.type === 'overdue' 
                                ? 'bg-[#FEE2E2] border-[#EF4444]' 
                                : notif.type === 'due_today'
                                ? 'bg-[#FEF3C7] border-[#F59E0B]'
                                : 'bg-[#DBEAFE] border-[#3B82F6]'
                            }`}
                          >
                            <p className="text-sm font-medium text-[#1E293B]">{notif.title}</p>
                            <p className="text-xs text-[#64748B] mt-1">{notif.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#64748B] py-4 text-center">No deadline notifications</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {user?.role === "admin" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/admin")}
                  data-testid="admin-button"
                  title="Admin Panel"
                >
                  <BarChart3 className="w-5 h-5" />
                </Button>
              )}

              <div className="flex items-center gap-2">
                <img
                  src={user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}`}
                  alt={user?.name}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium text-[#1E293B]">{user?.name}</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="logout-button"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#1E293B] mb-2" style={{ fontFamily: 'Manrope' }}>My Boards</h1>
            <p className="text-[#475569]">Manage your kanban boards and track progress</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                data-testid="create-board-button"
                className="bg-[#2E5C38] hover:bg-[#2E5C38]/90 text-white font-medium transition-all duration-200 ease-out rounded-md"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Board
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="create-board-description">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Manrope' }}>Create New Board</DialogTitle>
              </DialogHeader>
              <p id="create-board-description" className="sr-only">Create a new Kanban board with name and description</p>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="board-name">Board Name</Label>
                  <Input
                    id="board-name"
                    data-testid="board-name-input"
                    value={newBoard.name}
                    onChange={(e) => setNewBoard({ ...newBoard, name: e.target.value })}
                    placeholder="e.g., Production Line A"
                    className="focus:ring-[#2E5C38]"
                  />
                </div>
                <div>
                  <Label htmlFor="board-description">Description (Optional)</Label>
                  <Textarea
                    id="board-description"
                    data-testid="board-description-input"
                    value={newBoard.description}
                    onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                    placeholder="Brief description of this board"
                    className="focus:ring-[#2E5C38]"
                  />
                </div>
                <Button
                  onClick={handleCreateBoard}
                  data-testid="create-board-submit"
                  className="w-full bg-[#2E5C38] hover:bg-[#2E5C38]/90 text-white"
                >
                  Create Board
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {notifications.length > 0 && (
          <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-[#F59E0B] mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-[#92400E] mb-2">Upcoming Deadlines</h3>
                <ul className="space-y-1">
                  {notifications.slice(0, 3).map((notif, idx) => (
                    <li key={idx} className="text-sm text-[#92400E]">{notif.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board, idx) => (
            <div
              key={board.board_id}
              className="staggered-fade-in bg-white rounded-lg border border-[#E2E8F0] p-6 hover:border-[#2E5C38] hover:-translate-y-1 transition-all duration-200 ease-out relative group"
              data-testid={`board-card-${idx}`}
            >
              <div 
                className="cursor-pointer"
                onClick={() => navigate(`/board/${board.board_id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#2E5C38]/10 rounded-lg flex items-center justify-center">
                    <Layout className="w-6 h-6 text-[#2E5C38]" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-[#1E293B] mb-2" style={{ fontFamily: 'Manrope' }}>
                  {board.name}
                </h3>
                {board.description && (
                  <p className="text-[#475569] text-sm mb-4">{board.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Team Board</span>
                  </div>
                  {board.owner_id === user?.user_id && (
                    <span className="text-[#2E5C38] font-medium">Owner</span>
                  )}
                </div>
              </div>
              
              {board.owner_id === user?.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-[#EF4444] hover:text-white hover:bg-[#EF4444] z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteBoard(board.board_id, board.name);
                  }}
                  data-testid={`delete-board-${idx}`}
                  title="Delete Board"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {boards.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[#E2E8F0] rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout className="w-8 h-8 text-[#64748B]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1E293B] mb-2" style={{ fontFamily: 'Manrope' }}>No boards yet</h3>
            <p className="text-[#475569] mb-6">Create your first board to get started</p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#2E5C38] hover:bg-[#2E5C38]/90 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Board
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}