import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import CursorGlow from './components/CursorGlow.jsx';
import RouteEffects from './components/RouteEffects.jsx';
import { ToastProvider } from './components/Toasts.jsx';
import { RequireAuth } from './components/common.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CardBuilder from './pages/CardBuilder.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import PublicCard from './pages/PublicCard.jsx';
import Achievements from './pages/Achievements.jsx';
import Community from './pages/Community.jsx';
import Baskets from './pages/Baskets.jsx';
import BasketPage from './pages/BasketPage.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <ToastProvider>
      <CursorGlow />
      <RouteEffects />
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/community" element={<Community />} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/c/:id" element={<PublicCard />} />
          <Route path="/b/:id" element={<BasketPage />} />

          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />
          <Route
            path="/baskets"
            element={
              <RequireAuth>
                <Baskets />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/cards/new"
            element={
              <RequireAuth>
                <CardBuilder mode="create" />
              </RequireAuth>
            }
          />
          <Route
            path="/cards/:id/edit"
            element={
              <RequireAuth>
                <CardBuilder mode="edit" />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ToastProvider>
  );
}
