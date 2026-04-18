import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import "@/lib/i18n";

import { Layout } from "./components/layout";
import AuthPage from "./pages/auth";
import HubPage from "./pages/hub";
import AgendaPage from "./pages/agenda";
import ProgrammePage from "./pages/programme";
import GroupsPage from "./pages/groups";
import GroupChatPage from "./pages/group-chat";
import GroupControlPage from "./pages/group-control";
import AiChatPage from "./pages/ai-chat";
import AnnouncementsPage from "./pages/announcements";
import StudyHelpsPage from "./pages/study-helps";
import AccountPage from "./pages/account";
import ControlPanelPage from "./pages/control-panel";
import MessagesPage from "./pages/messages";
import DailySchedulePage from "./pages/daily-schedule";
import GPACalculatorPage from "./pages/gpa-calculator";
import KnowledgeRadarPage from "./pages/knowledge-radar";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? "/hub" : "/auth"} replace />} />
      <Route path="/auth" element={user ? <Navigate to="/hub" replace /> : <AuthPage />} />
      
      <Route path="/hub" element={<ProtectedRoute><HubPage /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
      <Route path="/programme" element={<ProtectedRoute><ProgrammePage /></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
      <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
      <Route path="/group/:id" element={<ProtectedRoute><GroupChatPage /></ProtectedRoute>} />
      <Route path="/group/:id/control" element={<ProtectedRoute><GroupControlPage /></ProtectedRoute>} />
      <Route path="/ai-chat" element={<ProtectedRoute><AiChatPage /></ProtectedRoute>} />
      <Route path="/study-helps" element={<ProtectedRoute><StudyHelpsPage /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/control-panel" element={<ProtectedRoute><ControlPanelPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
      <Route path="/daily-schedule" element={<ProtectedRoute><DailySchedulePage /></ProtectedRoute>} />
      <Route path="/gpa-calculator" element={<ProtectedRoute><GPACalculatorPage /></ProtectedRoute>} />
      <Route path="/knowledge-radar" element={<ProtectedRoute><KnowledgeRadarPage /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
