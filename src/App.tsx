import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { BlockchainProvider } from "@/contexts/BlockchainContext";
import Landing from "./pages/Landing";
import AdminDashboard from "./pages/AdminDashboard";
import PharmacyDashboard from "./pages/PharmacyDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BlockchainProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/pharmacy" element={<PharmacyDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </BlockchainProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
