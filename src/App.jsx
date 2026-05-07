import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'

const Import = lazy(() => import('./pages/Import'))
const Day = lazy(() => import('./pages/Day'))
const RouteDetail = lazy(() => import('./pages/Route'))
const Vespa = lazy(() => import('./pages/Vespa'))
const Tours = lazy(() => import('./pages/Tours'))
const TourDetail = lazy(() => import('./pages/TourDetail'))

export default function App() {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8">
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
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  )
}
