import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Protected from './components/Protected'
import LoginPage from './pages/Login'
import OrdersPage from './pages/Orders'
import FinancePage from './pages/Finance'
import NewsPage from './pages/News'
import PricesPage from './pages/Prices'
import CreditPage from './pages/Credit'
import QuadrantsPage from './pages/Quadrants'
import DashboardPage from './pages/Dashboard'
import UsersPage from './pages/Users'
import RolesPage from './pages/Roles'
import MenusPage from './pages/Menus'
import ScrapeSourcesPage from './pages/ScrapeSources'

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  if (location.pathname === '/login') return <>{children}</>
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <DashboardPage />
            </Protected>
          }
        />
        <Route
          path="/orders"
          element={
            <Protected>
              <OrdersPage />
            </Protected>
          }
        />
        <Route
          path="/finance"
          element={
            <Protected>
              <FinancePage />
            </Protected>
          }
        />
        <Route
          path="/news"
          element={
            <Protected>
              <NewsPage />
            </Protected>
          }
        />
        <Route
          path="/prices"
          element={
            <Protected>
              <PricesPage />
            </Protected>
          }
        />
        <Route
          path="/credit"
          element={
            <Protected>
              <CreditPage />
            </Protected>
          }
        />
        <Route
          path="/quadrants"
          element={
            <Protected>
              <QuadrantsPage />
            </Protected>
          }
        />
        <Route
          path="/users"
          element={
            <Protected>
              <UsersPage />
            </Protected>
          }
        />
        <Route
          path="/roles"
          element={
            <Protected>
              <RolesPage />
            </Protected>
          }
        />
        <Route
          path="/menus"
          element={
            <Protected>
              <MenusPage />
            </Protected>
          }
        />
        <Route
          path="/scrape-sources"
          element={
            <Protected>
              <ScrapeSourcesPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Shell>
  )
}
