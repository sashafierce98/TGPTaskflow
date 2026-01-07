import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ArrowLeft, Plus, Settings, MoreVertical, Calendar, User as UserIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const priorityColors = {
  low: "bg-[#10B981] text-white",
  medium: "bg-[#F59E0B] text-white",
  high: "bg-[#EF4444] text-white"
};

export default function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(null);
  const [showCardDetail, setShowCardDetail] = useState(null);
  const [showColumnSettings, setShowColumnSettings] = useState(null);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showAnswerDialog, setShowAnswerDialog] = useState(null);
  const [editingColumn, setEditingColumn] = useState(null);
  const [newColumn, setNewColumn] = useState({
    name: "",
    wip_limit: "",
    color: "#64748B"
  });
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCard, setNewCard] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: ""
  });

  useEffect(() => {
    fetchBoardData();
  }, [boardId]);

  const fetchBoardData = async () => {
    try {
      const [boardRes, columnsRes, cardsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/boards/${boardId}`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/boards/${boardId}/columns`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/boards/${boardId}/cards`, { withCredentials: true })
      ]);
      setBoard(boardRes.data);
      setColumns(columnsRes.data);
      setCards(cardsRes.data);
    } catch (error) {
      console.error("Failed to fetch board:", error);
      toast.error("Failed to load board");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (columnId) => {
    if (!newCard.title.trim()) {
      toast.error("Card title is required");
      return;
    }

    try {
      await axios.post(
        `${BACKEND_URL}/api/boards/${boardId}/columns/${columnId}/cards`,
        newCard,
        { withCredentials: true }
      );
      toast.success("Card created");
      setShowAddCard(null);
      setNewCard({ title: "", description: "", priority: "medium", due_date: "" });
      fetchBoardData();
    } catch (error) {
      console.error("Failed to create card:", error);
      toast.error("Failed to create card");
    }
  };

  const handleUpdateColumn = async () => {
    if (!editingColumn) return;

    try {
      await axios.put(
        `${BACKEND_URL}/api/columns/${editingColumn.column_id}`,
        {
          name: editingColumn.name,
          wip_limit: editingColumn.wip_limit === "" ? null : parseInt(editingColumn.wip_limit),
          color: editingColumn.color
        },
        { withCredentials: true }
      );
      toast.success("Column updated");
      setShowColumnSettings(null);
      setEditingColumn(null);
      fetchBoardData();
    } catch (error) {
      console.error("Failed to update column:", error);
      toast.error("Failed to update column");
    }
  };

  const handleAddColumn = async () => {
    if (!newColumn.name.trim()) {
      toast.error("Column name is required");
      return;
    }

    try {
      await axios.post(
        `${BACKEND_URL}/api/boards/${boardId}/columns`,
        {
          name: newColumn.name,
          wip_limit: newColumn.wip_limit === "" ? null : parseInt(newColumn.wip_limit),
          color: newColumn.color
        },
        { withCredentials: true }
      );
      toast.success("Column added");
      setShowBoardSettings(false);
      setNewColumn({ name: "", wip_limit: "", color: "#64748B" });
      fetchBoardData();
    } catch (error) {
      console.error("Failed to add column:", error);
      toast.error("Failed to add column");
    }
  };

  const openColumnSettings = (column) => {
    setEditingColumn({
      ...column,
      wip_limit: column.wip_limit ?? ""
    });
    setShowColumnSettings(column.column_id);
  };

  const handleAskQuestion = async () => {
    if (!newQuestion.trim()) {
      toast.error("Question cannot be empty");
      return;
    }

    const questionsColumn = columns.find(c => c.name === "Questions");
    if (!questionsColumn) {
      toast.error("Questions column not found");
      return;
    }

    try {
      await axios.post(
        `${BACKEND_URL}/api/boards/${boardId}/columns/${questionsColumn.column_id}/cards`,
        {
          title: newQuestion,
          description: "",
          priority: "medium"
        },
        { withCredentials: true }
      );
      toast.success("Question posted");
      setShowQuestionDialog(false);
      setNewQuestion("");
      fetchBoardData();
    } catch (error) {
      console.error("Failed to post question:", error);
      toast.error("Failed to post question");
    }
  };

  const handleAnswerQuestion = async (questionCard) => {
    if (!newAnswer.trim()) {
      toast.error("Answer cannot be empty");
      return;
    }

    try {
      await axios.post(
        `${BACKEND_URL}/api/cards/${questionCard.card_id}/comments`,
        { text: newAnswer },
        { withCredentials: true }
      );
      toast.success("Answer posted");
      setShowAnswerDialog(null);
      setNewAnswer("");
      fetchBoardData();
    } catch (error) {
      console.error("Failed to post answer:", error);
      toast.error("Failed to post answer");
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Get column names to check for Questions column
    const sourceColumn = columns.find(c => c.column_id === source.droppableId);
    const destColumn = columns.find(c => c.column_id === destination.droppableId);

    // Prevent dragging to/from Questions column
    if (sourceColumn?.name === "Questions" || destColumn?.name === "Questions") {
      toast.error("Questions cannot be moved to other columns");
      return;
    }

    // Optimistic update - update UI immediately for smooth experience
    const updatedCards = [...cards];
    const cardIndex = updatedCards.findIndex(card => card.card_id === draggableId);
    if (cardIndex !== -1) {
      updatedCards[cardIndex] = {
        ...updatedCards[cardIndex],
        column_id: destination.droppableId
      };
      setCards(updatedCards);
    }

    // Then update backend without blocking UI
    try {
      await axios.put(
        `${BACKEND_URL}/api/cards/${draggableId}`,
        { column_id: destination.droppableId },
        { withCredentials: true }
      );
      // Silently refresh data in background without toast
      fetchBoardData();
    } catch (error) {
      console.error("Failed to move card:", error);
      // Revert optimistic update on error
      fetchBoardData();
      toast.error("Failed to move card");
    }
  };

  const getCardsForColumn = (columnId) => {
    return cards.filter(card => card.column_id === columnId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#2E5C38] border-r-transparent"></div>
          <p className="mt-4 text-[#475569]">Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50 backdrop-blur-md bg-white/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
                  {board?.name}
                </h1>
                {board?.description && (
                  <p className="text-sm text-[#475569]">{board.description}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBoardSettings(true)}
              data-testid="board-settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="p-6 overflow-x-auto kanban-scrollbar">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 min-w-max pb-4">
            {columns.map((column) => {
              const columnCards = getCardsForColumn(column.column_id);
              const isWipLimitReached = column.wip_limit && columnCards.length >= column.wip_limit;

              return (
                <div key={column.column_id} className="flex-shrink-0 w-[320px]">
                  <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: column.color }}
                        ></div>
                        <h3 className="font-semibold text-[#1E293B]" style={{ fontFamily: 'Manrope' }}>
                          {column.name}
                        </h3>
                        <span className="text-sm text-[#64748B]">
                          {columnCards.length}
                          {column.wip_limit && ` / ${column.wip_limit}`}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => openColumnSettings(column)}
                        data-testid={`column-settings-${column.column_id}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>

                    {isWipLimitReached && (
                      <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded p-2 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
                        <span className="text-xs text-[#92400E]">WIP limit reached</span>
                      </div>
                    )}

                    <Droppable droppableId={column.column_id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 min-h-[100px] ${
                            snapshot.isDraggingOver ? 'bg-[#E2E8F0]/30 rounded-lg p-2' : ''
                          }`}
                        >
                          {columnCards.map((card, index) => (
                            <Draggable key={card.card_id} draggableId={card.card_id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white border border-[#E2E8F0] rounded-lg p-4 cursor-pointer hover:border-[#2E5C38] ${
                                    snapshot.isDragging ? 'card-drag-preview' : 'transition-colors duration-200 ease-out'
                                  }`}
                                  onClick={() => setShowCardDetail(card)}
                                  data-testid={`card-${card.card_id}`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-medium text-[#1E293B] flex-1">{card.title}</h4>
                                    <span className={`text-xs px-2 py-1 rounded ${priorityColors[card.priority]}`}>
                                      {card.priority}
                                    </span>
                                  </div>
                                  {card.description && (
                                    <p className="text-sm text-[#475569] mb-3 line-clamp-2">{card.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 text-xs text-[#64748B]">
                                    {card.due_date && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(card.due_date).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                    {card.assigned_to && (
                                      <div className="flex items-center gap-1">
                                        <UserIcon className="w-3 h-3" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    <Dialog
                      open={showAddCard === column.column_id}
                      onOpenChange={(open) => setShowAddCard(open ? column.column_id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full mt-3 text-[#475569] hover:text-[#2E5C38] hover:bg-[#2E5C38]/5"
                          data-testid={`add-card-${column.column_id}`}
                          disabled={isWipLimitReached}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Card
                        </Button>
                      </DialogTrigger>
                      <DialogContent aria-describedby="create-card-description">
                        <DialogHeader>
                          <DialogTitle style={{ fontFamily: 'Manrope' }}>Create New Card</DialogTitle>
                        </DialogHeader>
                        <p id="create-card-description" className="sr-only">Create a new card with title, description, priority, and due date</p>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label htmlFor="card-title">Title</Label>
                            <Input
                              id="card-title"
                              data-testid="card-title-input"
                              value={newCard.title}
                              onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                              placeholder="Card title"
                              className="focus:ring-[#2E5C38]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="card-description">Description</Label>
                            <Textarea
                              id="card-description"
                              data-testid="card-description-input"
                              value={newCard.description}
                              onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                              placeholder="Card description"
                              className="focus:ring-[#2E5C38]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="card-priority">Priority</Label>
                            <Select
                              value={newCard.priority}
                              onValueChange={(value) => setNewCard({ ...newCard, priority: value })}
                            >
                              <SelectTrigger data-testid="card-priority-select">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="card-due-date">Due Date</Label>
                            <Input
                              id="card-due-date"
                              data-testid="card-due-date-input"
                              type="date"
                              value={newCard.due_date}
                              onChange={(e) => setNewCard({ ...newCard, due_date: e.target.value })}
                              className="focus:ring-[#2E5C38]"
                            />
                          </div>
                          <Button
                            onClick={() => handleAddCard(column.column_id)}
                            data-testid="create-card-submit"
                            className="w-full bg-[#2E5C38] hover:bg-[#2E5C38]/90 text-white"
                          >
                            Create Card
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {showCardDetail && (
        <Dialog open={!!showCardDetail} onOpenChange={() => setShowCardDetail(null)}>
          <DialogContent className="max-w-2xl" aria-describedby="card-detail-description">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope' }}>{showCardDetail.title}</DialogTitle>
            </DialogHeader>
            <p id="card-detail-description" className="sr-only">View detailed information about this card</p>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Description</Label>
                <p className="text-[#475569] mt-2">{showCardDetail.description || "No description"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <span className={`inline-block mt-2 text-xs px-3 py-1 rounded ${priorityColors[showCardDetail.priority]}`}>
                    {showCardDetail.priority}
                  </span>
                </div>
                {showCardDetail.due_date && (
                  <div>
                    <Label>Due Date</Label>
                    <p className="text-[#475569] mt-2">{new Date(showCardDetail.due_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showColumnSettings && editingColumn && (
        <Dialog open={!!showColumnSettings} onOpenChange={() => setShowColumnSettings(null)}>
          <DialogContent aria-describedby="column-settings-description">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope' }}>Column Settings</DialogTitle>
            </DialogHeader>
            <p id="column-settings-description" className="sr-only">Customize column name, color, and WIP limit</p>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="column-name">Column Name</Label>
                <Input
                  id="column-name"
                  data-testid="column-name-input"
                  value={editingColumn.name}
                  onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })}
                  placeholder="Column name"
                  className="focus:ring-[#2E5C38]"
                />
              </div>
              <div>
                <Label htmlFor="wip-limit">WIP Limit (leave empty for unlimited)</Label>
                <Input
                  id="wip-limit"
                  data-testid="wip-limit-input"
                  type="number"
                  min="0"
                  value={editingColumn.wip_limit}
                  onChange={(e) => setEditingColumn({ ...editingColumn, wip_limit: e.target.value })}
                  placeholder="e.g., 5"
                  className="focus:ring-[#2E5C38]"
                />
                <p className="text-xs text-[#64748B] mt-1">
                  Current: {editingColumn.wip_limit || "Unlimited"} | Recommended for "In Progress": 3-5
                </p>
              </div>
              <div>
                <Label htmlFor="column-color">Column Color</Label>
                <div className="flex gap-2 mt-2">
                  {["#64748B", "#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditingColumn({ ...editingColumn, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                        editingColumn.color === color ? "border-[#2E5C38] scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      data-testid={`color-${color}`}
                    />
                  ))}
                </div>
              </div>
              <Button
                onClick={handleUpdateColumn}
                data-testid="save-column-settings"
                className="w-full bg-[#2E5C38] hover:bg-[#2E5C38]/90 text-white"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showBoardSettings && (
        <Dialog open={showBoardSettings} onOpenChange={setShowBoardSettings}>
          <DialogContent aria-describedby="board-settings-description">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope' }}>Board Settings</DialogTitle>
            </DialogHeader>
            <p id="board-settings-description" className="sr-only">Add new columns and manage board settings</p>
            <div className="space-y-6 mt-4">
              <div className="border-b border-[#E2E8F0] pb-4">
                <h3 className="text-lg font-semibold text-[#1E293B] mb-4" style={{ fontFamily: 'Manrope' }}>
                  Add New Column
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-column-name">Column Name</Label>
                    <Input
                      id="new-column-name"
                      data-testid="new-column-name-input"
                      value={newColumn.name}
                      onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                      placeholder="e.g., Testing, Review, Blocked"
                      className="focus:ring-[#2E5C38]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-wip-limit">WIP Limit (optional)</Label>
                    <Input
                      id="new-wip-limit"
                      data-testid="new-column-wip-input"
                      type="number"
                      min="0"
                      value={newColumn.wip_limit}
                      onChange={(e) => setNewColumn({ ...newColumn, wip_limit: e.target.value })}
                      placeholder="Leave empty for unlimited"
                      className="focus:ring-[#2E5C38]"
                    />
                  </div>
                  <div>
                    <Label>Column Color</Label>
                    <div className="flex gap-2 mt-2">
                      {["#64748B", "#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"].map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewColumn({ ...newColumn, color })}
                          className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                            newColumn.color === color ? "border-[#2E5C38] scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          data-testid={`new-color-${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleAddColumn}
                    data-testid="add-column-submit"
                    className="w-full bg-[#2E5C38] hover:bg-[#2E5C38]/90 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Column
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#1E293B] mb-2" style={{ fontFamily: 'Manrope' }}>
                  Current Columns
                </h3>
                <p className="text-sm text-[#64748B] mb-3">
                  Click the 3-dot menu on each column to edit or delete
                </p>
                <div className="space-y-2">
                  {columns.map((col) => (
                    <div key={col.column_id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: col.color }}></div>
                        <span className="font-medium text-[#1E293B]">{col.name}</span>
                        {col.wip_limit && (
                          <span className="text-xs text-[#64748B]">Limit: {col.wip_limit}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
