import { Wallet } from 'lucide-react';
import type { AppModule } from '../../app/modules';
import { money } from '../../lib/format';
import { useSubscriptions } from './data/hooks';
import { summarize } from './logic/calc';
import { ArchiveScreen } from './screens/Archive';
import { Dashboard } from './screens/Dashboard';

function HomeSummary() {
  const { data } = useSubscriptions();
  if (!data) return <>&nbsp;</>;
  const s = summarize(data, new Date());
  if (!data.some((x) => x.status === 'active')) return <>Chưa có gói nào</>;
  return <>{money(s.monthly)} / tháng{s.soonCount > 0 && ` · ${s.soonCount} sắp hạn`}</>;
}

export const subscriptionsModule: AppModule = {
  id: 'subscriptions',
  name: 'Subscription',
  icon: Wallet,
  path: '/subscriptions',
  routes: [
    { path: '/subscriptions', element: <Dashboard /> },
    { path: '/subscriptions/archive', element: <ArchiveScreen /> },
  ],
  Summary: HomeSummary,
};
