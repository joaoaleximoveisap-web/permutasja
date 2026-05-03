import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeEditorProvider } from "@/contexts/ThemeEditorContext";
import { BuilderProvider } from "@/contexts/BuilderContext";
import { LiveEditProvider } from "@/contexts/LiveEditContext";
import { LiveEditor } from "@/components/LiveEditor";
import { PropertiesProvider } from "@/contexts/PropertiesContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Properties from "./pages/Properties.tsx";
import ReviewProperty from "./pages/ReviewProperty.tsx";
import SmartSearch from "./pages/SmartSearch.tsx";
import Editor from "./pages/Editor.tsx";
import VisualBuilderPage from "./pages/VisualBuilder.tsx";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ThemeEditorProvider>
        <BuilderProvider>
          <LiveEditProvider>
          <PropertiesProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <LiveEditor />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/imoveis" element={<Properties />} />
                  <Route path="/revisar/:id" element={<ReviewProperty />} />
                  <Route path="/busca-inteligente" element={<SmartSearch />} />
                  <Route path="/editor" element={<Editor />} />
                  <Route path="/visual-builder" element={<VisualBuilderPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </PropertiesProvider>
        </BuilderProvider>
      </ThemeEditorProvider>
    </ThemeProvider>
  </QueryClientProvider>
);


export default App;

