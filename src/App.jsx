import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'

const Import = lazy(() => import('./pages/Import'))
const Day = lazy(() => import('./pages/Day'))
const RouteDetail = lazy(() => import('./pages/Route'))
const Vespa = lazy(() => import('./pages/Vespa'))

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/import" element={<Import />} />
            <Route path="/day/:date" element={<Day />} />
            <Route path="/route/:id" element={<RouteDetail />} />
            <Route path="/vespa" element={<Vespa />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
