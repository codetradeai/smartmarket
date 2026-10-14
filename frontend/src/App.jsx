import React from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import Home from "./pages/Home"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/catalog" element={<Home />} />
      <Route path="/list" element={<Home />} />
      <Route path="/compare" element={<Home />} />
      <Route path="/admin" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App