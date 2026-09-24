import { CalendarCheck } from 'lucide-react';
import type { AppModule } from '../../app/modules';
import { useHabitLogs, useHabits } from './data/hooks';
import { todayAverage } from './logic/calc';
import { HabitDetail } from './screens/HabitDetail';
import { HabitList } from './screens/HabitList';

function HomeSummary() {
  const { data } = useHabits();
  const { index, data: logs } = useHabitLogs();
  if (!data || !logs) return <>&nbsp;</>;
  const avg = todayAverage(data, index, new Date());
  return <>{avg === null ? 'Chưa có thói quen' : `Hôm nay ${avg}%`}</>;
}

export const habitsModule: AppModule = {
  id: 'habits',
  name: 'Thói quen',
  icon: CalendarCheck,
  path: '/habits',
  routes: [
    { path: '/habits', element: <HabitList /> },
    { path: '/habits/:id', element: <HabitDetail /> },
  ],
  Summary: HomeSummary,
};
