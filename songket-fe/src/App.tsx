import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/common/Layout'
import Protected from './components/common/Protected'

const LoginPage = lazy(() => import('./pages/auth/Login'))
const FinancePage = lazy(() => import('./pages/business/Finance'))
const FinanceReportPage = lazy(() => import('./pages/business/FinanceReport'))
const CreditPage = lazy(() => import('./pages/credit/Credit'))
const DashboardPage = lazy(() => import('./pages/dashboard/Dashboard'))
const InstallmentsPage = lazy(() => import('./pages/installments/Installments'))
const JobsPage = lazy(() => import('./pages/jobs/Jobs'))
const MenusPage = lazy(() => import('./pages/menus/Menus'))
const NewsPage = lazy(() => import('./pages/news/News'))
const OrdersPage = lazy(() => import('./pages/orders/Orders'))
const PricesPage = lazy(() => import('./pages/prices/Prices'))
const ProfilePage = lazy(() => import('./pages/profile/Profile'))
const QuadrantsPage = lazy(() => import('./pages/quadrants/Quadrants'))
const RolesPage = lazy(() => import('./pages/roles/Roles'))
const ScrapeSourcesPage = lazy(() => import('./pages/scrape-sources/ScrapeSources'))
const MasterSettingsPage = lazy(() => import('./pages/settings/MasterSettings'))
const UsersPage = lazy(() => import('./pages/users/Users'))

function RouteLoader() {
  return <div className="page"><div className="card">Loading...</div></div>
}

function Shell({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (location.pathname === '/login') return <>{children}</>
  return <Layout>{children}</Layout>
}

function Guarded({ children }: { children: ReactNode }) {
  return <Protected>{children}</Protected>
}

export default function App() {
  const location = useLocation()

  return (
    <Shell>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/dashboard" element={<Guarded><DashboardPage /></Guarded>} />

          <Route path="/orders" element={<Guarded><OrdersPage /></Guarded>} />
          <Route path="/orders/create" element={<Guarded><OrdersPage /></Guarded>} />
          <Route path="/orders/:id" element={<Guarded><OrdersPage /></Guarded>} />
          <Route path="/orders/:id/edit" element={<Guarded><OrdersPage /></Guarded>} />

          <Route path="/motor-types" element={<Guarded><Navigate to="/installments" replace /></Guarded>} />
          <Route path="/motor-types/create" element={<Guarded><Navigate to="/installments/create" replace /></Guarded>} />
          <Route path="/motor-types/:id" element={<Guarded><Navigate to="/installments" replace /></Guarded>} />
          <Route path="/motor-types/:id/edit" element={<Guarded><Navigate to="/installments" replace /></Guarded>} />

          <Route path="/installments" element={<Guarded><InstallmentsPage /></Guarded>} />
          <Route path="/installments/create" element={<Guarded><InstallmentsPage /></Guarded>} />
          <Route path="/installments/:id" element={<Guarded><InstallmentsPage /></Guarded>} />
          <Route path="/installments/:id/edit" element={<Guarded><InstallmentsPage /></Guarded>} />

          <Route path="/master-settings" element={<Guarded><MasterSettingsPage /></Guarded>} />
          <Route path="/master-settings/form" element={<Guarded><MasterSettingsPage /></Guarded>} />

          <Route path="/business" element={<Guarded><FinanceReportPage /></Guarded>} />
          <Route path="/business/summary" element={<Guarded><Navigate to="/business" replace /></Guarded>} />
          <Route path="/business/migrations/:id" element={<Guarded><FinanceReportPage /></Guarded>} />
          <Route path="/business/finance" element={<Guarded><FinancePage /></Guarded>} />
          <Route path="/business/finance/companies/create" element={<Guarded><FinancePage /></Guarded>} />
          <Route path="/business/finance/companies/:id" element={<Guarded><FinancePage /></Guarded>} />
          <Route path="/business/finance/companies/:id/edit" element={<Guarded><FinancePage /></Guarded>} />
          <Route path="/business/dealer" element={<Guarded><FinancePage /></Guarded>} />
          <Route path="/business/dealer/dealers/create" element={<Guarded><FinancePage /></Guarded>} />
          <Route path="/business/dealer/dealers/:id" element={<Guarded><FinancePage /></Guarded>} />
          <Route path="/business/dealer/dealers/:id/edit" element={<Guarded><FinancePage /></Guarded>} />

          <Route path="/finance" element={<Guarded><Navigate to="/business/finance" replace /></Guarded>} />
          <Route path="/finance/migrations/:id" element={<Guarded><FinanceReportPage /></Guarded>} />
          <Route path="/finance/companies/create" element={<Guarded><Navigate to="/business/finance/companies/create" replace /></Guarded>} />
          <Route path="/finance/companies/:id" element={<Guarded><FinancePage /></Guarded>} />
          <Route path="/finance/companies/:id/edit" element={<Guarded><FinancePage /></Guarded>} />
          <Route path="/finance-report" element={<Guarded><Navigate to="/business" replace /></Guarded>} />
          <Route path="/finance-report/:id" element={<Guarded><FinanceReportPage /></Guarded>} />
          <Route path="/dealer" element={<Guarded><Navigate to="/business/dealer" replace /></Guarded>} />
          <Route path="/dealer/dealers/create" element={<Guarded><Navigate to="/business/dealer/dealers/create" replace /></Guarded>} />
          <Route path="/dealer/dealers/:id" element={<Guarded><FinancePage /></Guarded>} />
          <Route path="/dealer/dealers/:id/edit" element={<Guarded><FinancePage /></Guarded>} />

          <Route path="/news" element={<Guarded><NewsPage /></Guarded>} />
          <Route path="/news/scrape" element={<Guarded><NewsPage /></Guarded>} />
          <Route path="/news/:id" element={<Guarded><NewsPage /></Guarded>} />

          <Route path="/prices" element={<Guarded><PricesPage /></Guarded>} />
          <Route path="/prices/create" element={<Guarded><PricesPage /></Guarded>} />
          <Route path="/prices/:id" element={<Guarded><PricesPage /></Guarded>} />

          <Route path="/credit" element={<Guarded><CreditPage /></Guarded>} />
          <Route path="/quadrants" element={<Guarded><QuadrantsPage /></Guarded>} />
          <Route path="/jobs" element={<Guarded key={`jobs:${location.pathname}`}><JobsPage key={`jobs-page:${location.pathname}`} /></Guarded>} />
          <Route path="/jobs/create" element={<Guarded key={`jobs:${location.pathname}`}><JobsPage key={`jobs-page:${location.pathname}`} /></Guarded>} />
          <Route path="/jobs/:id" element={<Guarded key={`jobs:${location.pathname}`}><JobsPage key={`jobs-page:${location.pathname}`} /></Guarded>} />
          <Route path="/jobs/:id/edit" element={<Guarded key={`jobs:${location.pathname}`}><JobsPage key={`jobs-page:${location.pathname}`} /></Guarded>} />
          <Route path="/net-income" element={<Guarded><Navigate to="/jobs" replace /></Guarded>} />
          <Route path="/net-income/create" element={<Guarded><Navigate to="/jobs/create" replace /></Guarded>} />
          <Route path="/net-income/:id" element={<Guarded><Navigate to="/jobs" replace /></Guarded>} />
          <Route path="/net-income/:id/edit" element={<Guarded><Navigate to="/jobs" replace /></Guarded>} />

          <Route path="/users" element={<Guarded><UsersPage /></Guarded>} />
          <Route path="/users/create" element={<Guarded><UsersPage /></Guarded>} />
          <Route path="/users/:id" element={<Guarded><Navigate to="/users" replace /></Guarded>} />
          <Route path="/users/:id/edit" element={<Guarded><UsersPage /></Guarded>} />

          <Route path="/profile" element={<Guarded><ProfilePage /></Guarded>} />

          <Route path="/roles" element={<Guarded><RolesPage /></Guarded>} />
          <Route path="/roles/create" element={<Guarded><RolesPage /></Guarded>} />
          <Route path="/roles/:id" element={<Guarded><RolesPage /></Guarded>} />
          <Route path="/roles/:id/edit" element={<Guarded><RolesPage /></Guarded>} />

          <Route path="/menus" element={<Guarded><MenusPage /></Guarded>} />
          <Route path="/menus/create" element={<Guarded><Navigate to="/menus" replace /></Guarded>} />
          <Route path="/menus/:id" element={<Guarded><MenusPage /></Guarded>} />
          <Route path="/menus/:id/edit" element={<Guarded><MenusPage /></Guarded>} />

          <Route path="/scrape-sources" element={<Guarded><ScrapeSourcesPage /></Guarded>} />
          <Route path="/scrape-sources/create" element={<Guarded><ScrapeSourcesPage /></Guarded>} />
          <Route path="/scrape-sources/:id" element={<Guarded><ScrapeSourcesPage /></Guarded>} />
          <Route path="/scrape-sources/:id/edit" element={<Guarded><ScrapeSourcesPage /></Guarded>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
