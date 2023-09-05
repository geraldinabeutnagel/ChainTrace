import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './hooks/useWeb3';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';

// Layout components
import Layout from './components/Layout/Layout';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Batches from './pages/Batches';
import Traces from './pages/Traces';
import IoT from './pages/IoT';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Protected route component
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <AuthProvider>
          <ThemeProvider>
            <Router>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  
                  {/* Protected routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout>
                        <Header />
                        <div className="flex">
                          <Sidebar />
                          <main className="flex-1 p-6">
                            <Dashboard />
                          </main>
                        </div>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/products" element={
                    <ProtectedRoute>
                      <Layout>
                        <Header />
                        <div className="flex">
                          <Sidebar />
                          <main className="flex-1 p-6">
                            <Products />
                          </main>
                        </div>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/batches" element={
                    <ProtectedRoute>
                      <Layout>
                        <Header />
                        <div className="flex">
                          <Sidebar />
                          <main className="flex-1 p-6">
                            <Batches />
                          </main>
                        </div>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/traces" element={
                    <ProtectedRoute>
                      <Layout>
                        <Header />
                        <div className="flex">
                          <Sidebar />
                          <main className="flex-1 p-6">
                            <Traces />
                          </main>
                        </div>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/iot" element={
                    <ProtectedRoute>
                      <Layout>
                        <Header />
                        <div className="flex">
                          <Sidebar />
                          <main className="flex-1 p-6">
                            <IoT />
                          </main>
                        </div>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/analytics" element={
                    <ProtectedRoute>
                      <Layout>
                        <Header />
                        <div className="flex">
                          <Sidebar />
                          <main className="flex-1 p-6">
                            <Analytics />
                          </main>
                        </div>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Layout>
                        <Header />
                        <div className="flex">
                          <Sidebar />
                          <main className="flex-1 p-6">
                            <Settings />
                          </main>
                        </div>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* 404 route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                
                {/* Global toast notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: '#10B981',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      duration: 5000,
                      iconTheme: {
                        primary: '#EF4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </ThemeProvider>
        </AuthProvider>
      </Web3Provider>
    </QueryClientProvider>
  );
}

export default App;
