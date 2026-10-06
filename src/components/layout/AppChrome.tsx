import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandBar } from './CommandBar';
import { MobileTabBar } from './MobileTabBar';
import { ToastProvider } from '../ui/Toast';

/**
 * Combined app chrome rendered as a single React island so Sidebar/TopBar/CommandBar
 * share state without multiple hydration points.
 */
export function AppChrome({ currentPath }: { currentPath: string }) {
  const [path, setPath] = useState(currentPath);
  useEffect(() => { setPath(window.location.pathname); }, []);
  return (
    <ToastProvider>
      <Sidebar currentPath={path} />
      <TopBar currentPath={path} />
      <CommandBar />
      <MobileTabBar currentPath={path} />
    </ToastProvider>
  );
}
