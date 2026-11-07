import HomePage from '@/pages/HomePage';
import SharePage from '@/pages/SharePage';
import FolderPage from '@/pages/FolderPage';
import AdminPage from '@/pages/AdminPage';

function App() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('admin')) {
    return <AdminPage />;
  }

  const shareToken = params.get('share');
  if (shareToken) {
    return <SharePage token={shareToken} />;
  }

  const folderId = params.get('folder');
  if (folderId) {
    return <FolderPage folderId={folderId} />;
  }

  return <HomePage />;
}

export default App;
