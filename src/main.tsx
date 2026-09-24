import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from './app/Home';
import { PasscodeGate } from './app/PasscodeGate';
import { MODULES } from './app/modules';
import { seedHabitsDemoIfRequested } from './modules/habits/data/repo';
import { seedDemoIfRequested } from './modules/subscriptions/data/repo';
import { ToastProvider } from './shared/Toast';
import './index.css';

seedHabitsDemoIfRequested(); // chạy trước — seed Subscription xóa ?demo khỏi URL
seedDemoIfRequested();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PasscodeGate>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              {MODULES.flatMap((m) => m.routes).map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </PasscodeGate>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
