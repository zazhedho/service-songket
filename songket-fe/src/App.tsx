import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Protected from './components/Protected'
import CreditPage from './pages/Credit'
import DashboardPage from './pages/Dashboard'
import FinancePage from './pages/Finance'
import JobsPage from './pages/Jobs'
import LoginPage from './pages/Login'
import MenusPage from './pages/Menus'
import NetIncomePage from './pages/NetIncome'
import NewsPage from './pages/News'
import OrdersPage from './pages/Orders'
import PricesPage from './pages/Prices'
import QuadrantsPage from './pages/Quadrants'
import RoleMenuAccessPage from './pages/RoleMenuAccess'
import RolesPage from './pages/Roles'
import ScrapeSourcesPage from './pages/ScrapeSources'
import UsersPage from './pages/Users'

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  if (location.pathname === '/login') return <>{children}</>
  return <Layout>{children}</Layout>
}

function Guarded({ children }: { children: React.ReactNode }) {
  return <Protected>{children}</Protected>
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/dashboard" element={<Guarded><DashboardPage /></Guarded>} />

        <Route path="/orders" element={<Guarded><OrdersPage /></Guarded>} />
        <Route path="/orders/create" element={<Guarded><OrdersPage /></Guarded>} />
        <Route path="/orders/:id" element={<Guarded><OrdersPage /></Guarded>} />
        <Route path="/orders/:id/edit" element={<Guarded><OrdersPage /></Guarded>} />

        <Route path="/finance" element={<Guarded><FinancePage /></Guarded>} />
        <Route path="/finance/dealers/create" element={<Guarded><FinancePage /></Guarded>} />
        <Route path="/finance/dealers/:id" element={<Guarded><FinancePage /></Guarded>} />
        <Route path="/finance/dealers/:id/edit" element={<Guarded><FinancePage /></Guarded>} />
        <Route path="/finance/companies/create" element={<Guarded><FinancePage /></Guarded>} />
        <Route path="/finance/companies/:id" element={<Guarded><FinancePage /></Guarded>} />
        <Route path="/finance/companies/:id/edit" element={<Guarded><FinancePage /></Guarded>} />

        <Route path="/news" element={<Guarded><NewsPage /></Guarded>} />
        <Route path="/news/scrape" element={<Guarded><NewsPage /></Guarded>} />
        <Route path="/news/:id" element={<Guarded><NewsPage /></Guarded>} />

        <Route path="/prices" element={<Guarded><PricesPage /></Guarded>} />
        <Route path="/prices/create" element={<Guarded><PricesPage /></Guarded>} />
        <Route path="/prices/:id" element={<Guarded><PricesPage /></Guarded>} />

        <Route path="/credit" element={<Guarded><CreditPage /></Guarded>} />
        <Route path="/quadrants" element={<Guarded><QuadrantsPage /></Guarded>} />
        <Route path="/jobs" element={<Guarded><JobsPage /></Guarded>} />
        <Route path="/jobs/create" element={<Guarded><JobsPage /></Guarded>} />
        <Route path="/jobs/:id" element={<Guarded><JobsPage /></Guarded>} />
        <Route path="/jobs/:id/edit" element={<Guarded><JobsPage /></Guarded>} />
        <Route path="/net-income" element={<Guarded><NetIncomePage /></Guarded>} />
        <Route path="/net-income/create" element={<Guarded><NetIncomePage /></Guarded>} />
        <Route path="/net-income/:id" element={<Guarded><NetIncomePage /></Guarded>} />
        <Route path="/net-income/:id/edit" element={<Guarded><NetIncomePage /></Guarded>} />

        <Route path="/users" element={<Guarded><UsersPage /></Guarded>} />
        <Route path="/users/create" element={<Guarded><UsersPage /></Guarded>} />
        <Route path="/users/:id" element={<Guarded><UsersPage /></Guarded>} />
        <Route path="/users/:id/edit" element={<Guarded><UsersPage /></Guarded>} />

        <Route path="/roles" element={<Guarded><RolesPage /></Guarded>} />
        <Route path="/roles/create" element={<Guarded><RolesPage /></Guarded>} />
        <Route path="/roles/:id" element={<Guarded><RolesPage /></Guarded>} />
        <Route path="/roles/:id/edit" element={<Guarded><RolesPage /></Guarded>} />

        <Route path="/menus" element={<Guarded><MenusPage /></Guarded>} />
        <Route path="/menus/create" element={<Guarded><MenusPage /></Guarded>} />
        <Route path="/menus/:id" element={<Guarded><MenusPage /></Guarded>} />
        <Route path="/menus/:id/edit" element={<Guarded><MenusPage /></Guarded>} />

        <Route path="/scrape-sources" element={<Guarded><ScrapeSourcesPage /></Guarded>} />
        <Route path="/scrape-sources/create" element={<Guarded><ScrapeSourcesPage /></Guarded>} />
        <Route path="/scrape-sources/:id" element={<Guarded><ScrapeSourcesPage /></Guarded>} />
        <Route path="/scrape-sources/:id/edit" element={<Guarded><ScrapeSourcesPage /></Guarded>} />

        <Route path="/role-menu-access" element={<Guarded><RoleMenuAccessPage /></Guarded>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Shell>
  )
}
