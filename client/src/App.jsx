import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import ClientApp from './client/ClientApp.jsx';
import ManagerApp from './manager/ManagerApp.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/manager/*" element={<ManagerApp />} />
        <Route path="/*" element={<ClientApp />} />
      </Routes>
    </AuthProvider>
  );
}
