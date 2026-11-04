import { registerSyncTable } from '@/lib/sync/registry';

import { useWater, waterFromRow } from '../store';

registerSyncTable({
  table: 'water_entries',
  order: 30,
  owner: 'user_id',
  applyRemote: (rows) => {
    useWater.getState().applyRemote(
      rows.filter((r) => !r.deleted_at).map(waterFromRow),
      rows.filter((r) => r.deleted_at).map((r) => String(r.id)),
    );
  },
});
