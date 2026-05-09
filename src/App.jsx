import { lazy, Suspense, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import MobileTopBar from './components/MobileTopBar'
import MobileNavDrawer from './components/MobileNavDrawer'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'

const Import = lazy(() => import('./pages/Import'))
const Day = lazy(() => import('./pages/Day'))
const RouteDetail = lazy(() => import('./pages/Route'))
const Vespa = lazy(() => import('./pages/Vespa'))
const Tours = lazy(() => import('./pages/Tours'))
const TourDetail = lazy(() => import('./pages/TourDetail'))
const Impressum = lazy(() => import('./pages/Impressum'))
const Datenschutz = lazy(() => import('./pages/Datenschutz'))

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <MobileTopBar onOpen={() => setDrawerOpen(true)} />
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main className="flex-1 overflow-x-hidden px-4 pb-6 pt-20 md:px-8 md:pt-6">
        <div className="mx-auto w-full max-w-6xl">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/import" element={<Import />} />
              <Route path="/day/:date" element={<Day />} />
              <Route path="/route/:id" element={<RouteDetail />} />
              <Route path="/vespa" element={<Vespa />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tours" element={<Tours />} />
              <Route path="/tour/:id" element={<TourDetail />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  )
}
