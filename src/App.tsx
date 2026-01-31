import { Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { AddItemPage } from './pages/AddItemPage'
import { ItemDetailPage } from './pages/ItemDetailPage'
import { PreparePostPage } from './pages/PreparePostPage'
import { AnalyticsPage } from './pages/AnalyticsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/add-item" element={<AddItemPage />} />
      <Route path="/item/:id" element={<ItemDetailPage />} />
      <Route path="/prepare-post" element={<PreparePostPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
    </Routes>
  )
}

export default App
