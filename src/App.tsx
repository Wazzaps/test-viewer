import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/HomePage';
import TestsPage from '@/pages/TestsPage';
import './globals.css';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tests/:org/:repo" element={<TestsPage />} />
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
