import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SelectSelf from './pages/SelectSelf';
import SelectMatch from './pages/SelectMatch';
import Waiting from './pages/Waiting';
import Result from './pages/Result';
import Admin from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-md mx-auto min-h-screen">
        <Routes>
          <Route path="/" element={<SelectSelf />} />
          <Route path="/choose" element={<SelectMatch />} />
          <Route path="/waiting" element={<Waiting />} />
          <Route path="/result" element={<Result />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
