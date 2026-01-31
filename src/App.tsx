import { Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { AddItemPage } from './pages/AddItemPage'
import { ItemDetailPage } from './pages/ItemDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/add-item" element={<AddItemPage />} />
      <Route path="/item/:id" element={<ItemDetailPage />} />
    </Routes>
  )
}

export default App
