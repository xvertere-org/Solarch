import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from './components/ThemeProvider'
import { DocsDrawerProvider } from './components/DocsDrawerContext'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import Docs from './pages/Docs'
import About from './pages/About'
import FAQ from './pages/FAQ'
import Feedback from './pages/Feedback'
import Privacy from './pages/Privacy'
import Projects from './pages/Projects'
import ProjectGuide from './pages/projects/ProjectGuide'
import NotFound from './pages/NotFound'

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <DocsDrawerProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/docs/:section/:subsection?" element={<Docs />} />
              <Route path="/docs" element={<Navigate to="/docs/getting-started/quick-start" replace />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:slug" element={<ProjectGuide />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </DocsDrawerProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}

export default App
